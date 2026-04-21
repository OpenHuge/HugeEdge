package platform

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
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

	var nodes []Node
	doJSON(t, server.URL, http.MethodGet, "/v1/admin/nodes", tokens.AccessToken, nil, http.StatusOK, &nodes)
	if len(nodes) != 1 || nodes[0].Status != "ready" {
		t.Fatalf("expected one ready node, got %#v", nodes)
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
	seen := map[string]bool{}
	for _, entry := range audit {
		seen[entry.Action] = true
	}
	for _, action := range []string{"auth.login", "tenant.create", "node.bootstrap_token.create"} {
		if !seen[action] {
			t.Fatalf("missing audit action %q in %#v", action, audit)
		}
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

	migrationPath := filepath.Join("..", "..", "db", "migrations", "000001_init.up.sql")
	migration, err := os.ReadFile(migrationPath)
	if err != nil {
		t.Fatalf("read migration %s: %v", migrationPath, err)
	}
	if _, err := pool.Exec(ctx, string(migration)); err != nil {
		t.Fatalf("apply migration: %v", err)
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
