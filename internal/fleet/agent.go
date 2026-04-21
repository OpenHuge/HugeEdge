package fleet

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"time"

	runtimeadapter "github.com/hugeedge/hugeedge/contracts/runtime-adapter"
	xrayadapter "github.com/hugeedge/hugeedge/plugins/xray-adapter"
)

type AgentConfig struct {
	ControlPlaneURL   string
	BootstrapToken    string
	AdapterName       string
	HeartbeatInterval time.Duration
	StateDir          string
	AgentVersion      string
}

type AgentClient struct {
	cfg                AgentConfig
	client             *http.Client
	adapter            runtimeadapter.Adapter
	state              agentState
	capabilitiesPushed bool
}

type agentState struct {
	NodeID                string `json:"nodeId"`
	CurrentConfigVersion  int    `json:"currentConfigVersion"`
	PreviousConfigVersion int    `json:"previousConfigVersion"`
}

type configBundle struct {
	BundleVersion int            `json:"bundleVersion"`
	AdapterName   string         `json:"adapterName"`
	Config        map[string]any `json:"config"`
	Hash          string         `json:"hash"`
	IssuedAt      time.Time      `json:"issuedAt"`
}

func LoadAgentConfig() AgentConfig {
	return AgentConfig{
		ControlPlaneURL:   getenv("HUGEEDGE_CONTROL_PLANE_URL", "http://localhost:8080"),
		BootstrapToken:    getenv("HUGEEDGE_BOOTSTRAP_TOKEN", "local-bootstrap"),
		AdapterName:       "xray-adapter",
		HeartbeatInterval: 30 * time.Second,
		StateDir:          getenv("HUGEEDGE_STATE_DIR", "./.hugeedge-agent"),
		AgentVersion:      "0.1.0",
	}
}

func NewAgentClient(cfg AgentConfig) *AgentClient {
	return &AgentClient{
		cfg:     cfg,
		client:  &http.Client{Timeout: 10 * time.Second},
		adapter: &xrayadapter.Adapter{},
		state:   loadAgentState(cfg.StateDir),
	}
}

func (c *AgentClient) RunCycle(ctx context.Context) error {
	if err := c.EnsureEnrollment(ctx); err != nil {
		return err
	}
	if c.state.NodeID == "" {
		return nil
	}
	if !c.capabilitiesPushed {
		if err := c.PublishCapabilities(ctx); err != nil {
			return err
		}
		c.capabilitiesPushed = true
	}
	if err := c.Heartbeat(ctx); err != nil {
		return err
	}
	return c.Reconcile(ctx)
}

func (c *AgentClient) EnsureEnrollment(ctx context.Context) error {
	if c.state.NodeID != "" {
		if err := c.Renew(ctx); err == nil {
			return nil
		}
	}
	return c.Register(ctx)
}

func (c *AgentClient) Register(ctx context.Context) error {
	var node struct {
		ID string `json:"id"`
	}
	if err := c.post(ctx, "/v1/agent/register", map[string]string{"bootstrapToken": c.cfg.BootstrapToken}, &node); err != nil {
		return err
	}
	c.state.NodeID = node.ID
	return c.persistState()
}

func (c *AgentClient) Renew(ctx context.Context) error {
	if c.state.NodeID == "" {
		return errors.New("agent is not enrolled")
	}
	return c.post(ctx, "/v1/agent/renew", map[string]string{
		"nodeId":      c.state.NodeID,
		"adapterName": c.cfg.AdapterName,
	}, nil)
}

func (c *AgentClient) Heartbeat(ctx context.Context) error {
	if c.state.NodeID == "" {
		return nil
	}
	return c.post(ctx, "/v1/agent/heartbeat", map[string]string{
		"nodeId": c.state.NodeID,
		"status": "ready",
	}, nil)
}

func (c *AgentClient) PublishCapabilities(ctx context.Context) error {
	if c.state.NodeID == "" {
		return nil
	}
	capabilities, err := c.adapter.Discover(ctx)
	if err != nil {
		return err
	}
	return c.post(ctx, "/v1/agent/capabilities", map[string]any{
		"nodeId":        c.state.NodeID,
		"schemaVersion": "0.1.0",
		"adapter": map[string]string{
			"name":                c.adapter.Name(),
			"compatibilityTarget": c.adapter.CompatibilityTarget(),
			"version":             c.adapter.Version(),
		},
		"capabilities": capabilities,
	}, nil)
}

func (c *AgentClient) Reconcile(ctx context.Context) error {
	bundle, err := c.nextConfig(ctx)
	if err != nil || bundle == nil {
		return err
	}
	if err := c.reportConfig(ctx, bundle.BundleVersion, "in_progress", "applying config bundle", "online", 100); err != nil {
		return err
	}

	configJSON, err := json.Marshal(bundle.Config)
	if err != nil {
		return err
	}
	if err := c.writeBundle(bundle.BundleVersion, configJSON); err != nil {
		return err
	}
	if err := c.snapshotPrevious(configJSON); err != nil {
		return err
	}

	if err := c.adapter.Validate(configJSON); err != nil {
		return c.handleApplyFailure(ctx, bundle, fmt.Sprintf("validate failed: %v", err))
	}
	if err := c.adapter.Apply(configJSON); err != nil {
		return c.handleApplyFailure(ctx, bundle, fmt.Sprintf("apply failed: %v", err))
	}
	if failureMode(configJSON) == "health" {
		return c.handleApplyFailure(ctx, bundle, "health check failed: simulated health failure")
	}
	if err := c.adapter.HealthCheck(ctx); err != nil {
		return c.handleApplyFailure(ctx, bundle, fmt.Sprintf("health check failed: %v", err))
	}

	c.state.PreviousConfigVersion = c.state.CurrentConfigVersion
	c.state.CurrentConfigVersion = bundle.BundleVersion
	if err := c.persistState(); err != nil {
		return err
	}
	return c.reportConfig(ctx, bundle.BundleVersion, "succeeded", "config applied successfully", "online", 100)
}

func (c *AgentClient) handleApplyFailure(ctx context.Context, bundle *configBundle, message string) error {
	if err := c.reportConfig(ctx, bundle.BundleVersion, "failed", message, "degraded", 70); err != nil {
		return err
	}
	if err := c.restorePrevious(); err != nil {
		message = fmt.Sprintf("%s; rollback restore failed: %v", message, err)
	}
	if err := c.adapter.Rollback(); err != nil {
		message = fmt.Sprintf("%s; adapter rollback failed: %v", message, err)
	}
	c.state.CurrentConfigVersion = c.state.PreviousConfigVersion
	if err := c.persistState(); err != nil {
		return err
	}
	return c.reportConfig(ctx, bundle.BundleVersion, "rolled_back", message, "degraded", 70)
}

func (c *AgentClient) nextConfig(ctx context.Context) (*configBundle, error) {
	var bundle configBundle
	err := c.post(ctx, "/v1/agent/config/next", map[string]any{
		"nodeId":               c.state.NodeID,
		"currentConfigVersion": c.state.CurrentConfigVersion,
		"agentVersion":         c.cfg.AgentVersion,
		"runtimeVersion":       c.adapter.Version(),
	}, &bundle)
	if err == nil {
		return &bundle, nil
	}
	var apiErr *apiError
	if errors.As(err, &apiErr) && apiErr.StatusCode == http.StatusNoContent {
		return nil, nil
	}
	return nil, err
}

func (c *AgentClient) reportConfig(
	ctx context.Context,
	bundleVersion int,
	status string,
	message string,
	healthStatus string,
	healthScore int,
) error {
	return c.post(ctx, "/v1/agent/config/report", map[string]any{
		"nodeId":         c.state.NodeID,
		"bundleVersion":  bundleVersion,
		"status":         status,
		"message":        message,
		"healthStatus":   healthStatus,
		"healthScore":    healthScore,
		"agentVersion":   c.cfg.AgentVersion,
		"runtimeVersion": c.adapter.Version(),
	}, nil)
}

func (c *AgentClient) post(ctx context.Context, path string, body any, out any) error {
	payload, err := json.Marshal(body)
	if err != nil {
		return err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.cfg.ControlPlaneURL+path, bytes.NewReader(payload))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	resp, err := c.client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode < 200 || resp.StatusCode > 299 {
		return &apiError{StatusCode: resp.StatusCode, Path: path}
	}
	if resp.StatusCode == http.StatusNoContent {
		return &apiError{StatusCode: resp.StatusCode, Path: path}
	}
	if out != nil {
		return json.NewDecoder(resp.Body).Decode(out)
	}
	return nil
}

func (c *AgentClient) persistState() error {
	if err := os.MkdirAll(c.cfg.StateDir, 0o755); err != nil {
		return err
	}
	payload, err := json.MarshalIndent(c.state, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(filepath.Join(c.cfg.StateDir, "state.json"), payload, 0o600)
}

func (c *AgentClient) writeBundle(version int, config []byte) error {
	if err := os.MkdirAll(filepath.Join(c.cfg.StateDir, "bundles"), 0o755); err != nil {
		return err
	}
	if err := os.MkdirAll(filepath.Join(c.cfg.StateDir, "active"), 0o755); err != nil {
		return err
	}
	if err := os.WriteFile(filepath.Join(c.cfg.StateDir, "bundles", fmt.Sprintf("%d.json", version)), config, 0o600); err != nil {
		return err
	}
	return os.WriteFile(filepath.Join(c.cfg.StateDir, "active", "config.json"), config, 0o600)
}

func (c *AgentClient) snapshotPrevious(_ []byte) error {
	if err := os.MkdirAll(filepath.Join(c.cfg.StateDir, "previous"), 0o755); err != nil {
		return err
	}
	currentPath := filepath.Join(c.cfg.StateDir, "active", "config.json")
	previousPath := filepath.Join(c.cfg.StateDir, "previous", "config.json")
	current, err := os.ReadFile(currentPath)
	if err == nil {
		return os.WriteFile(previousPath, current, 0o600)
	}
	if errors.Is(err, os.ErrNotExist) {
		_ = os.Remove(previousPath)
		return nil
	}
	return err
}

func (c *AgentClient) restorePrevious() error {
	previous, err := os.ReadFile(filepath.Join(c.cfg.StateDir, "previous", "config.json"))
	if errors.Is(err, os.ErrNotExist) {
		return os.Remove(filepath.Join(c.cfg.StateDir, "active", "config.json"))
	}
	if err != nil {
		return err
	}
	if err := os.MkdirAll(filepath.Join(c.cfg.StateDir, "active"), 0o755); err != nil {
		return err
	}
	return os.WriteFile(filepath.Join(c.cfg.StateDir, "active", "config.json"), previous, 0o600)
}

func loadAgentState(stateDir string) agentState {
	payload, err := os.ReadFile(filepath.Join(stateDir, "state.json"))
	if err != nil {
		return agentState{}
	}
	var state agentState
	if json.Unmarshal(payload, &state) != nil {
		return agentState{}
	}
	return state
}

func failureMode(config []byte) string {
	var payload map[string]any
	if err := json.Unmarshal(config, &payload); err != nil {
		return ""
	}
	mode, _ := payload["simulateFailure"].(string)
	return mode
}

type apiError struct {
	StatusCode int
	Path       string
}

func (e *apiError) Error() string {
	return fmt.Sprintf("control plane request failed: POST %s: %d", e.Path, e.StatusCode)
}

func getenv(key string, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}
