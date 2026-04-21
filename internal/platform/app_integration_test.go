package platform

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"sort"
	"testing"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

func TestAppDatabaseBackedControlPlaneFlow(t *testing.T) {
	databaseURL := os.Getenv("TEST_DATABASE_URL")
	if databaseURL == "" {
		t.Skip("set TEST_DATABASE_URL to run Postgres integration tests")
	}

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	resetTestDatabase(t, ctx, databaseURL)

	app := NewApp(Config{
		HTTPAddr:    ":0",
		DatabaseURL: databaseURL,
		JWTSecret:   "integration-test-secret",
	})
	defer app.Close()

	server := httptest.NewServer(app.Router())
	defer server.Close()

	var tokens AuthTokens
	doJSON(t, server.URL, http.MethodPost, "/v1/auth/login", "", map[string]string{
		"email":    "admin@example.com",
		"password": "correct-horse-battery-staple",
	}, http.StatusOK, &tokens)
	if tokens.AccessToken == "" || tokens.RefreshToken == "" {
		t.Fatalf("login did not return both tokens: %#v", tokens)
	}

	var me map[string]any
	doJSON(t, server.URL, http.MethodGet, "/v1/app/me", tokens.AccessToken, nil, http.StatusOK, &me)
	if me["email"] != "admin@example.com" {
		t.Fatalf("unexpected /me response: %#v", me)
	}

	var tenant Tenant
	doJSON(t, server.URL, http.MethodPost, "/v1/admin/tenants", tokens.AccessToken, map[string]string{
		"name": "",
		"slug": "Bad Slug",
	}, http.StatusBadRequest, nil)
	doJSON(t, server.URL, http.MethodPost, "/v1/admin/tenants", tokens.AccessToken, map[string]string{
		"name": "Acme",
		"slug": "acme",
	}, http.StatusCreated, &tenant)
	if tenant.ID == "" || tenant.Slug != "acme" {
		t.Fatalf("unexpected tenant: %#v", tenant)
	}

	doJSON(t, server.URL, http.MethodPost, "/v1/admin/tenants", tokens.AccessToken, map[string]string{
		"name": "Acme Again",
		"slug": "acme",
	}, http.StatusConflict, nil)

	var bootstrap BootstrapToken
	doJSON(t, server.URL, http.MethodPost, "/v1/admin/nodes/bootstrap-tokens", tokens.AccessToken, nil, http.StatusCreated, &bootstrap)
	if bootstrap.Token == "" {
		t.Fatal("bootstrap token was empty")
	}

	var node Node
	doJSON(t, server.URL, http.MethodPost, "/v1/agent/register", "", map[string]string{
		"bootstrapToken": bootstrap.Token,
	}, http.StatusCreated, &node)
	if node.ID == "" || node.AdapterName != "xray-adapter" {
		t.Fatalf("unexpected registered node: %#v", node)
	}

	doJSON(t, server.URL, http.MethodPost, "/v1/agent/heartbeat", "", map[string]string{
		"nodeId": node.ID,
		"status": "ready",
	}, http.StatusAccepted, nil)

	var rollout Rollout
	doJSON(t, server.URL, http.MethodPost, "/v1/admin/rollouts", tokens.AccessToken, map[string]any{
		"nodeId":      node.ID,
		"adapterName": "xray-adapter",
		"config":      map[string]any{"mode": "baseline"},
		"note":        "Initial config rollout",
	}, http.StatusCreated, &rollout)
	if rollout.BundleVersion != 1 || rollout.Status != "pending" {
		t.Fatalf("unexpected rollout create response: %#v", rollout)
	}

	var nextBundle ConfigBundle
	doJSON(t, server.URL, http.MethodPost, "/v1/agent/config/next", "", map[string]any{
		"nodeId":               node.ID,
		"currentConfigVersion": 0,
		"agentVersion":         "0.1.0",
		"runtimeVersion":       "0.1.0",
	}, http.StatusOK, &nextBundle)
	if nextBundle.BundleVersion != 1 {
		t.Fatalf("unexpected config bundle: %#v", nextBundle)
	}
	doJSON(t, server.URL, http.MethodPost, "/v1/agent/config/report", "", map[string]any{
		"nodeId":         node.ID,
		"bundleVersion":  nextBundle.BundleVersion,
		"status":         "in_progress",
		"message":        "applying config bundle",
		"healthStatus":   "online",
		"healthScore":    100,
		"agentVersion":   "0.1.0",
		"runtimeVersion": "0.1.0",
	}, http.StatusAccepted, nil)
	doJSON(t, server.URL, http.MethodPost, "/v1/agent/config/report", "", map[string]any{
		"nodeId":         node.ID,
		"bundleVersion":  nextBundle.BundleVersion,
		"status":         "succeeded",
		"message":        "config applied successfully",
		"healthStatus":   "online",
		"healthScore":    100,
		"agentVersion":   "0.1.0",
		"runtimeVersion": "0.1.0",
	}, http.StatusAccepted, nil)

	var rollbackCandidate Rollout
	doJSON(t, server.URL, http.MethodPost, "/v1/admin/rollouts", tokens.AccessToken, map[string]any{
		"nodeId":      node.ID,
		"adapterName": "xray-adapter",
		"config":      map[string]any{"mode": "bad", "simulateFailure": "health"},
		"note":        "Failing rollout",
	}, http.StatusCreated, &rollbackCandidate)
	doJSON(t, server.URL, http.MethodPost, "/v1/agent/config/next", "", map[string]any{
		"nodeId":               node.ID,
		"currentConfigVersion": 1,
		"agentVersion":         "0.1.0",
		"runtimeVersion":       "0.1.0",
	}, http.StatusOK, &nextBundle)
	doJSON(t, server.URL, http.MethodPost, "/v1/agent/config/report", "", map[string]any{
		"nodeId":         node.ID,
		"bundleVersion":  nextBundle.BundleVersion,
		"status":         "failed",
		"message":        "health check failed",
		"healthStatus":   "degraded",
		"healthScore":    70,
		"agentVersion":   "0.1.0",
		"runtimeVersion": "0.1.0",
	}, http.StatusAccepted, nil)
	doJSON(t, server.URL, http.MethodPost, "/v1/agent/config/report", "", map[string]any{
		"nodeId":         node.ID,
		"bundleVersion":  nextBundle.BundleVersion,
		"status":         "rolled_back",
		"message":        "rolled back to last known good",
		"healthStatus":   "degraded",
		"healthScore":    70,
		"agentVersion":   "0.1.0",
		"runtimeVersion": "0.1.0",
	}, http.StatusAccepted, nil)

	var rollbackTarget Rollout
	doJSON(t, server.URL, http.MethodPost, "/v1/admin/rollouts", tokens.AccessToken, map[string]any{
		"nodeId":      node.ID,
		"adapterName": "xray-adapter",
		"config":      map[string]any{"mode": "steady"},
		"note":        "Rollback candidate",
	}, http.StatusCreated, &rollbackTarget)
	doJSON(t, server.URL, http.MethodPost, "/v1/agent/config/next", "", map[string]any{
		"nodeId":               node.ID,
		"currentConfigVersion": 1,
		"agentVersion":         "0.1.0",
		"runtimeVersion":       "0.1.0",
	}, http.StatusOK, &nextBundle)
	doJSON(t, server.URL, http.MethodPost, "/v1/agent/config/report", "", map[string]any{
		"nodeId":         node.ID,
		"bundleVersion":  nextBundle.BundleVersion,
		"status":         "succeeded",
		"message":        "steady config applied",
		"healthStatus":   "online",
		"healthScore":    100,
		"agentVersion":   "0.1.0",
		"runtimeVersion": "0.1.0",
	}, http.StatusAccepted, nil)

	var nodes []Node
	doJSON(t, server.URL, http.MethodGet, "/v1/admin/nodes", tokens.AccessToken, nil, http.StatusOK, &nodes)
	if len(nodes) != 1 || nodes[0].Status != "ready" {
		t.Fatalf("expected one ready node, got %#v", nodes)
	}
	if nodes[0].LastHeartbeatAt == nil {
		t.Fatalf("expected node heartbeat timestamp, got %#v", nodes[0])
	}
	if nodes[0].CurrentConfigVersion == nil || *nodes[0].CurrentConfigVersion != 3 {
		t.Fatalf("expected current config version 3 after steady rollout, got %#v", nodes[0])
	}
	if nodes[0].DesiredConfigVersion == nil || *nodes[0].DesiredConfigVersion != 3 {
		t.Fatalf("expected desired config version 3 after steady rollout, got %#v", nodes[0])
	}
	if nodes[0].LastApplyStatus != "succeeded" || nodes[0].HealthStatus != "online" || nodes[0].HealthScore != 100 {
		t.Fatalf("unexpected node apply state after steady rollout: %#v", nodes[0])
	}

	var rollouts []Rollout
	doJSON(t, server.URL, http.MethodGet, "/v1/admin/rollouts", tokens.AccessToken, nil, http.StatusOK, &rollouts)
	if len(rollouts) < 2 {
		t.Fatalf("expected at least two rollouts, got %#v", rollouts)
	}

	var rollbackRollout Rollout
	doJSON(t, server.URL, http.MethodPost, "/v1/admin/rollouts/"+rollbackTarget.ID+"/rollback", tokens.AccessToken, nil, http.StatusCreated, &rollbackRollout)
	if rollbackRollout.RollbackOfRolloutID != rollbackTarget.ID {
		t.Fatalf("unexpected rollback rollout response: %#v", rollbackRollout)
	}
	doJSON(t, server.URL, http.MethodPost, "/v1/agent/config/next", "", map[string]any{
		"nodeId":               node.ID,
		"currentConfigVersion": 3,
		"agentVersion":         "0.1.0",
		"runtimeVersion":       "0.1.0",
	}, http.StatusOK, &nextBundle)

	if _, err := app.store.db.Exec(ctx, `UPDATE rollouts SET created_at = now() - interval '5 minutes' WHERE id = $1`, rollbackRollout.ID); err != nil {
		t.Fatalf("backdate rollout for timeout: %v", err)
	}
	reports, err := app.store.FailStaleRollouts(ctx, 2*time.Minute)
	if err != nil {
		t.Fatalf("fail stale rollouts: %v", err)
	}
	if len(reports) == 0 {
		t.Fatal("expected timeout report for stale rollout")
	}

	var providers []Provider
	doJSON(t, server.URL, http.MethodGet, "/v1/admin/providers", tokens.AccessToken, nil, http.StatusOK, &providers)
	if len(providers) == 0 {
		t.Fatal("expected seeded providers")
	}
	var regions []Region
	doJSON(t, server.URL, http.MethodGet, "/v1/admin/regions", tokens.AccessToken, nil, http.StatusOK, &regions)
	if len(regions) == 0 {
		t.Fatal("expected seeded regions")
	}

	var rotated AuthTokens
	doJSON(t, server.URL, http.MethodPost, "/v1/auth/refresh", "", map[string]string{
		"refreshToken": tokens.RefreshToken,
	}, http.StatusOK, &rotated)
	doJSON(t, server.URL, http.MethodPost, "/v1/auth/refresh", "", map[string]string{
		"refreshToken": tokens.RefreshToken,
	}, http.StatusUnauthorized, nil)

	var audit []AuditLog
	doJSON(t, server.URL, http.MethodGet, "/v1/admin/audit-logs", rotated.AccessToken, nil, http.StatusOK, &audit)
	seen := map[string]AuditLog{}
	for _, entry := range audit {
		seen[entry.Action] = entry
	}
	for _, action := range []string{"auth.login", "tenant.create", "node.bootstrap_token.create"} {
		if _, ok := seen[action]; !ok {
			t.Fatalf("missing audit action %q in %#v", action, audit)
		}
	}
	for _, action := range []string{"rollout.create", "node.config_apply.started", "node.config_apply.succeeded", "node.config_apply.failed", "node.config_apply.rolled_back"} {
		if _, ok := seen[action]; !ok {
			t.Fatalf("missing config apply audit action %q in %#v", action, audit)
		}
	}
	if seen["tenant.create"].Metadata["slug"] != "acme" {
		t.Fatalf("missing tenant create audit metadata: %#v", seen["tenant.create"])
	}
	if _, ok := seen["node.bootstrap_token.create"].Metadata["expiresAt"]; !ok {
		t.Fatalf("missing bootstrap token audit metadata: %#v", seen["node.bootstrap_token.create"])
	}
}

func resetTestDatabase(t *testing.T, ctx context.Context, databaseURL string) {
	t.Helper()

	pool, err := pgxpool.New(ctx, databaseURL)
	if err != nil {
		t.Fatalf("connect test database: %v", err)
	}
	defer pool.Close()

	if _, err := pool.Exec(ctx, `DROP SCHEMA public CASCADE; CREATE SCHEMA public;`); err != nil {
		t.Fatalf("reset schema: %v", err)
	}

	matches, err := filepath.Glob(filepath.Join("..", "..", "db", "migrations", "*.up.sql"))
	if err != nil {
		t.Fatalf("glob migrations: %v", err)
	}
	sort.Strings(matches)
	for _, migrationPath := range matches {
		migration, err := os.ReadFile(migrationPath)
		if err != nil {
			t.Fatalf("read migration %s: %v", migrationPath, err)
		}
		if _, err := pool.Exec(ctx, string(migration)); err != nil {
			t.Fatalf("apply migration %s: %v", migrationPath, err)
		}
	}
}

func doJSON(t *testing.T, baseURL string, method string, path string, accessToken string, body any, wantStatus int, out any) {
	t.Helper()

	var payload bytes.Buffer
	if body != nil {
		if err := json.NewEncoder(&payload).Encode(body); err != nil {
			t.Fatalf("encode request body: %v", err)
		}
	}

	req, err := http.NewRequest(method, baseURL+path, &payload)
	if err != nil {
		t.Fatalf("new request: %v", err)
	}
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	if accessToken != "" {
		req.Header.Set("Authorization", "Bearer "+accessToken)
	}

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("%s %s failed: %v", method, path, err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != wantStatus {
		var errorBody map[string]any
		_ = json.NewDecoder(resp.Body).Decode(&errorBody)
		t.Fatalf("%s %s status = %d, want %d, body %#v", method, path, resp.StatusCode, wantStatus, errorBody)
	}
	if out != nil {
		if err := json.NewDecoder(resp.Body).Decode(out); err != nil {
			t.Fatalf("decode response body: %v", err)
		}
	}
}
