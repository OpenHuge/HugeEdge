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
	if me["accountId"] == "" || me["billingScope"] == "" {
		t.Fatalf("expected account-scoped /me response: %#v", me)
	}

	var accounts []Account
	doJSON(t, server.URL, http.MethodGet, "/v1/admin/accounts", tokens.AccessToken, nil, http.StatusOK, &accounts)
	if len(accounts) != 1 || accounts[0].Type != "individual" {
		t.Fatalf("expected one bootstrapped individual account, got %#v", accounts)
	}

	var createdAccount Account
	doJSON(t, server.URL, http.MethodPost, "/v1/admin/accounts", tokens.AccessToken, map[string]string{
		"type":         "organization",
		"name":         "Northwind",
		"billingEmail": "billing@northwind.example",
	}, http.StatusCreated, &createdAccount)
	if createdAccount.ID == "" || createdAccount.DefaultTenantID == "" {
		t.Fatalf("unexpected created account: %#v", createdAccount)
	}

	doJSON(t, server.URL, http.MethodPatch, "/v1/admin/accounts", tokens.AccessToken, map[string]any{
		"id":     createdAccount.ID,
		"status": "suspended",
	}, http.StatusOK, &createdAccount)
	if createdAccount.Status != "suspended" {
		t.Fatalf("expected suspended account after patch, got %#v", createdAccount)
	}

	var overview BillingOverview
	doJSON(t, server.URL, http.MethodGet, "/v1/app/billing/overview", tokens.AccessToken, nil, http.StatusOK, &overview)
	if overview.Account.ID == "" || overview.ActiveSubscription == nil {
		t.Fatalf("unexpected billing overview: %#v", overview)
	}
	if overview.ActiveSubscription.Status != "trialing" {
		t.Fatalf("expected bootstrapped trial subscription, got %#v", overview.ActiveSubscription)
	}
	if overview.AvailableProductCount < 3 {
		t.Fatalf("expected seeded catalog products, got %#v", overview)
	}

	var products []CatalogProduct
	doJSON(t, server.URL, http.MethodGet, "/v1/app/catalog/products", tokens.AccessToken, nil, http.StatusOK, &products)
	if len(products) < 3 || len(products[0].SKUs) == 0 {
		t.Fatalf("expected seeded catalog products with skus, got %#v", products)
	}

	var subscriptions []Subscription
	doJSON(t, server.URL, http.MethodGet, "/v1/app/subscriptions", tokens.AccessToken, nil, http.StatusOK, &subscriptions)
	if len(subscriptions) != 1 {
		t.Fatalf("expected one bootstrapped subscription, got %#v", subscriptions)
	}

	var subscription Subscription
	doJSON(t, server.URL, http.MethodGet, "/v1/app/subscriptions/"+subscriptions[0].ID, tokens.AccessToken, nil, http.StatusOK, &subscription)
	if subscription.ID != subscriptions[0].ID || subscription.FeedCount != 1 {
		t.Fatalf("unexpected subscription detail: %#v", subscription)
	}

	var orders []Order
	doJSON(t, server.URL, http.MethodGet, "/v1/app/orders", tokens.AccessToken, nil, http.StatusOK, &orders)
	if len(orders) != 1 {
		t.Fatalf("expected one bootstrapped order, got %#v", orders)
	}

	var order Order
	doJSON(t, server.URL, http.MethodGet, "/v1/app/orders/"+orders[0].ID, tokens.AccessToken, nil, http.StatusOK, &order)
	if order.ID != orders[0].ID {
		t.Fatalf("unexpected order detail: %#v", order)
	}

	var feeds []SubscriptionFeed
	doJSON(t, server.URL, http.MethodGet, "/v1/app/subscription-feeds", tokens.AccessToken, nil, http.StatusOK, &feeds)
	if len(feeds) != 1 || feeds[0].Token == "" || feeds[0].AccessURL == "" {
		t.Fatalf("expected a readable subscription feed, got %#v", feeds)
	}

	feedResp := doRequest(t, server.URL, http.MethodGet, "/v1/sub/"+feeds[0].Token, "", nil)
	defer feedResp.Body.Close()
	if feedResp.StatusCode != http.StatusOK {
		t.Fatalf("unexpected feed status: %d", feedResp.StatusCode)
	}
	if feedResp.Header.Get("X-HE-Plan") == "" {
		t.Fatalf("expected feed metadata headers, got %#v", feedResp.Header)
	}
	var delivery FeedDelivery
	decodeResponseJSON(t, feedResp, &delivery)
	if delivery.FeedID != feeds[0].ID || delivery.Plan == "" {
		t.Fatalf("unexpected feed delivery payload: %#v", delivery)
	}

	feedHead := doRequest(t, server.URL, http.MethodHead, "/v1/sub/"+feeds[0].Token, "", nil)
	defer feedHead.Body.Close()
	if feedHead.StatusCode != http.StatusOK {
		t.Fatalf("unexpected feed HEAD status: %d", feedHead.StatusCode)
	}
	if feedHead.Header.Get("X-HE-ETag") == "" {
		t.Fatalf("expected feed HEAD etag metadata, got %#v", feedHead.Header)
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
	for _, action := range []string{"auth.login", "account.create", "account.update", "tenant.create", "node.bootstrap_token.create"} {
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

	resp := doRequest(t, baseURL, method, path, accessToken, body)
	defer resp.Body.Close()

	if resp.StatusCode != wantStatus {
		var errorBody map[string]any
		_ = json.NewDecoder(resp.Body).Decode(&errorBody)
		t.Fatalf("%s %s status = %d, want %d, body %#v", method, path, resp.StatusCode, wantStatus, errorBody)
	}
	if out != nil {
		decodeResponseJSON(t, resp, out)
	}
}

func doRequest(t *testing.T, baseURL string, method string, path string, accessToken string, body any) *http.Response {
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
	return resp
}

func decodeResponseJSON(t *testing.T, resp *http.Response, out any) {
	t.Helper()
	if out == nil || resp.StatusCode == http.StatusNoContent {
		return
	}
	if err := json.NewDecoder(resp.Body).Decode(out); err != nil {
		t.Fatalf("decode response body: %v", err)
	}
}
