package fleet

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"time"
)

type AgentConfig struct {
	ControlPlaneURL   string
	BootstrapToken    string
	AdapterName       string
	HeartbeatInterval time.Duration
}

type AgentClient struct {
	cfg    AgentConfig
	client *http.Client
	nodeID string
}

func LoadAgentConfig() AgentConfig {
	return AgentConfig{
		ControlPlaneURL:   getenv("HUGEEDGE_CONTROL_PLANE_URL", "http://localhost:8080"),
		BootstrapToken:    getenv("HUGEEDGE_BOOTSTRAP_TOKEN", "local-bootstrap"),
		AdapterName:       "xray-adapter",
		HeartbeatInterval: 30 * time.Second,
	}
}

func NewAgentClient(cfg AgentConfig) *AgentClient {
	return &AgentClient{cfg: cfg, client: &http.Client{Timeout: 10 * time.Second}}
}

func (c *AgentClient) Register(ctx context.Context) error {
	var node struct {
		ID string `json:"id"`
	}
	if err := c.post(ctx, "/v1/agent/register", map[string]string{"bootstrapToken": c.cfg.BootstrapToken}, &node); err != nil {
		return err
	}
	c.nodeID = node.ID
	return nil
}

func (c *AgentClient) Renew(ctx context.Context) error {
	return c.post(ctx, "/v1/agent/renew", map[string]string{"nodeId": c.nodeID, "adapterName": c.cfg.AdapterName}, nil)
}

func (c *AgentClient) Heartbeat(ctx context.Context) error {
	return c.post(ctx, "/v1/agent/heartbeat", map[string]string{"nodeId": c.nodeID, "status": "ready"}, nil)
}

func (c *AgentClient) PublishCapabilities(ctx context.Context) error {
	return c.post(ctx, "/v1/agent/capabilities", map[string]any{
		"nodeId":        c.nodeID,
		"schemaVersion": "0.1.0",
		"adapter":       map[string]string{"name": c.cfg.AdapterName, "compatibilityTarget": "xray-adapter"},
		"capabilities":  []map[string]string{{"name": "agent.heartbeat", "version": "0.1.0"}},
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
		return fmt.Errorf("control plane request failed: %s %s: %s", req.Method, path, resp.Status)
	}
	if out != nil {
		return json.NewDecoder(resp.Body).Decode(out)
	}
	return nil
}

func getenv(key string, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}
