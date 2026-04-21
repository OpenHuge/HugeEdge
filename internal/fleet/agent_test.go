package fleet

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"
)

func TestReconcileSuccess(t *testing.T) {
	t.Parallel()

	var reports []string
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/v1/agent/config/next":
			writeJSON(t, w, configBundle{
				BundleVersion: 1,
				AdapterName:   "xray-adapter",
				Config:        map[string]any{"mode": "baseline"},
				Hash:          "hash",
			})
		case "/v1/agent/config/report":
			var body struct {
				Status string `json:"status"`
			}
			if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
				t.Fatalf("decode report: %v", err)
			}
			reports = append(reports, body.Status)
			w.WriteHeader(http.StatusAccepted)
		default:
			t.Fatalf("unexpected path %s", r.URL.Path)
		}
	}))
	defer server.Close()

	client := NewAgentClient(AgentConfig{
		ControlPlaneURL: server.URL,
		StateDir:        t.TempDir(),
		AgentVersion:    "0.1.0",
		AdapterName:     "xray-adapter",
	})
	client.state.NodeID = "node-1"

	if err := client.Reconcile(context.Background()); err != nil {
		t.Fatalf("reconcile: %v", err)
	}
	if got := reports; len(got) != 2 || got[0] != "in_progress" || got[1] != "succeeded" {
		t.Fatalf("unexpected reports: %#v", got)
	}
	if client.state.CurrentConfigVersion != 1 {
		t.Fatalf("unexpected current config version: %#v", client.state)
	}
	if _, err := os.Stat(filepath.Join(client.cfg.StateDir, "active", "config.json")); err != nil {
		t.Fatalf("missing active config: %v", err)
	}
}

func TestReconcileRollbackOnHealthFailure(t *testing.T) {
	t.Parallel()

	var reports []string
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/v1/agent/config/next":
			writeJSON(t, w, configBundle{
				BundleVersion: 2,
				AdapterName:   "xray-adapter",
				Config: map[string]any{
					"mode":            "bad",
					"simulateFailure": "health",
				},
				Hash: "hash",
			})
		case "/v1/agent/config/report":
			var body struct {
				Status string `json:"status"`
			}
			if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
				t.Fatalf("decode report: %v", err)
			}
			reports = append(reports, body.Status)
			w.WriteHeader(http.StatusAccepted)
		default:
			t.Fatalf("unexpected path %s", r.URL.Path)
		}
	}))
	defer server.Close()

	client := NewAgentClient(AgentConfig{
		ControlPlaneURL: server.URL,
		StateDir:        t.TempDir(),
		AgentVersion:    "0.1.0",
		AdapterName:     "xray-adapter",
	})
	client.state.NodeID = "node-1"
	client.state.CurrentConfigVersion = 1
	client.state.PreviousConfigVersion = 1
	if err := os.MkdirAll(filepath.Join(client.cfg.StateDir, "active"), 0o755); err != nil {
		t.Fatalf("mkdir active: %v", err)
	}
	if err := os.WriteFile(filepath.Join(client.cfg.StateDir, "active", "config.json"), []byte(`{"mode":"baseline"}`), 0o600); err != nil {
		t.Fatalf("seed active config: %v", err)
	}

	if err := client.Reconcile(context.Background()); err != nil {
		t.Fatalf("reconcile: %v", err)
	}
	if got := reports; len(got) != 3 || got[0] != "in_progress" || got[1] != "failed" || got[2] != "rolled_back" {
		t.Fatalf("unexpected reports: %#v", got)
	}
	if client.state.CurrentConfigVersion != 1 {
		t.Fatalf("unexpected current config version after rollback: %#v", client.state)
	}
}

func writeJSON(t *testing.T, w http.ResponseWriter, body any) {
	t.Helper()
	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(body); err != nil {
		t.Fatalf("encode response: %v", err)
	}
}
