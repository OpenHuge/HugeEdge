package platform

import (
	"context"
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"regexp"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/rs/cors"
)

type App struct {
	cfg   Config
	deps  Dependencies
	store *Store
}

var tenantSlugPattern = regexp.MustCompile(`^[a-z0-9]+(?:-[a-z0-9]+)*$`)

func NewApp(cfg Config) *App {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	pool, err := pgxpool.New(ctx, cfg.DatabaseURL)
	if err != nil {
		slog.Error("database pool initialization failed", "error", err)
		panic(err)
	}
	app := &App{
		cfg:   cfg,
		deps:  Dependencies{DB: pool, Tracer: BootstrapTelemetry("hugeedge-api")},
		store: NewStore(pool),
	}
	if err := app.store.Ping(ctx); err != nil {
		slog.Error("database ping failed", "error", err)
		panic(err)
	}
	return app
}

func (a *App) Close() {
	a.store.Close()
}

func (a *App) Store() *Store {
	return a.store
}

func (a *App) Router() http.Handler {
	r := chi.NewRouter()
	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)

	r.Get("/healthz", a.health)
	r.Get("/readyz", a.ready)

	r.Route("/v1", func(r chi.Router) {
		r.Post("/auth/login", a.login)
		r.Post("/auth/refresh", a.refresh)
		r.Post("/auth/logout", a.logout)

		r.Group(func(r chi.Router) {
			r.Use(a.authMiddleware)
			r.Get("/app/me", a.me)
			r.Get("/admin/tenants", a.listTenants)
			r.Post("/admin/tenants", a.createTenant)
			r.Get("/admin/tenants/{tenantId}", a.getTenant)
			r.Get("/admin/providers", a.listProviders)
			r.Get("/admin/regions", a.listRegions)
			r.Get("/admin/nodes", a.listNodes)
			r.Get("/admin/nodes/{nodeId}", a.getNode)
			r.Post("/admin/nodes/bootstrap-tokens", a.createBootstrapToken)
			r.Get("/admin/rollouts", a.listRollouts)
			r.Post("/admin/rollouts", a.createRollout)
			r.Get("/admin/rollouts/{rolloutId}", a.getRollout)
			r.Post("/admin/rollouts/{rolloutId}/rollback", a.rollbackRollout)
			r.Get("/admin/capabilities", a.listCapabilities)
			r.Get("/admin/audit-logs", a.listAudit)
		})

		r.Post("/agent/register", a.agentRegister)
		r.Post("/agent/renew", a.accepted)
		r.Post("/agent/heartbeat", a.accepted)
		r.Post("/agent/capabilities", a.accepted)
		r.Post("/agent/config/next", a.agentConfigNext)
		r.Post("/agent/config/report", a.agentConfigReport)
	})

	return cors.AllowAll().Handler(r)
}

func (a *App) health(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (a *App) ready(w http.ResponseWriter, _ *http.Request) {
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()
	if err := a.store.Ping(ctx); err != nil {
		writeError(w, http.StatusServiceUnavailable, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "ready"})
}

func (a *App) login(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	if err := decode(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, err)
		return
	}
	principal, err := a.store.AuthenticateOrBootstrap(r.Context(), req.Email, req.Password)
	if errors.Is(err, ErrInvalidCredentials) {
		writeError(w, http.StatusUnauthorized, err)
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, err)
		return
	}
	tokens, err := a.issueTokens(principal.UserID, principal.TenantID, principal.SessionID, principal.RoleIDs)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err)
		return
	}
	if err := a.store.SaveRefreshToken(r.Context(), tokens.RefreshToken, principal.SessionID); err != nil {
		writeError(w, http.StatusInternalServerError, err)
		return
	}
	if err := a.store.Audit(r.Context(), "auth.login", principal.UserID, principal.TenantID, nil); err != nil {
		writeError(w, http.StatusInternalServerError, err)
		return
	}
	writeJSON(w, http.StatusOK, tokens)
}

func (a *App) refresh(w http.ResponseWriter, r *http.Request) {
	var req struct {
		RefreshToken string `json:"refreshToken"`
	}
	if err := decode(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, err)
		return
	}
	principal, err := a.store.RotateRefreshToken(r.Context(), req.RefreshToken)
	if errors.Is(err, ErrInvalidRefreshToken) {
		writeError(w, http.StatusUnauthorized, errors.New("invalid refresh token"))
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, err)
		return
	}
	tokens, err := a.issueTokens(principal.UserID, principal.TenantID, principal.SessionID, principal.RoleIDs)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err)
		return
	}
	if err := a.store.SaveRefreshToken(r.Context(), tokens.RefreshToken, principal.SessionID); err != nil {
		writeError(w, http.StatusInternalServerError, err)
		return
	}
	writeJSON(w, http.StatusOK, tokens)
}

func (a *App) logout(w http.ResponseWriter, r *http.Request) {
	if claims, ok := a.optionalClaims(r); ok {
		if err := a.store.RevokeSession(r.Context(), claims.SessionID); err != nil {
			writeError(w, http.StatusInternalServerError, err)
			return
		}
	}
	w.WriteHeader(http.StatusNoContent)
}

func (a *App) me(w http.ResponseWriter, r *http.Request) {
	claims := claimsFromContext(r.Context())
	user, err := a.store.User(r.Context(), claims.Subject)
	if errors.Is(err, ErrNotFound) {
		writeError(w, http.StatusNotFound, err)
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"id":        claims.Subject,
		"email":     user.Email,
		"tenantId":  claims.TenantID,
		"roleIds":   claims.RoleIDs,
		"sessionId": claims.SessionID,
	})
}

func (a *App) listTenants(w http.ResponseWriter, r *http.Request) {
	tenants, err := a.store.ListTenants(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, err)
		return
	}
	writeJSON(w, http.StatusOK, tenants)
}

func (a *App) createTenant(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Name string `json:"name"`
		Slug string `json:"slug"`
	}
	if err := decode(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, err)
		return
	}
	req.Name = strings.TrimSpace(req.Name)
	req.Slug = strings.TrimSpace(req.Slug)
	if req.Name == "" {
		writeError(w, http.StatusBadRequest, errors.New("tenant name is required"))
		return
	}
	if !tenantSlugPattern.MatchString(req.Slug) {
		writeError(w, http.StatusBadRequest, errors.New("tenant slug must use lowercase letters, numbers, and hyphens"))
		return
	}
	claims := claimsFromContext(r.Context())
	tenant, err := a.store.CreateTenant(r.Context(), req.Name, req.Slug)
	if errors.Is(err, ErrConflict) {
		writeError(w, http.StatusConflict, errors.New("tenant slug already exists"))
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, err)
		return
	}
	if err := a.store.Audit(r.Context(), "tenant.create", claims.Subject, tenant.ID, map[string]any{
		"tenantId": tenant.ID,
		"slug":     tenant.Slug,
	}); err != nil {
		writeError(w, http.StatusInternalServerError, err)
		return
	}
	writeJSON(w, http.StatusCreated, tenant)
}

func (a *App) getTenant(w http.ResponseWriter, r *http.Request) {
	tenant, err := a.store.Tenant(r.Context(), chi.URLParam(r, "tenantId"))
	if errors.Is(err, ErrNotFound) {
		writeError(w, http.StatusNotFound, errors.New("tenant not found"))
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, err)
		return
	}
	writeJSON(w, http.StatusOK, tenant)
}

func (a *App) listProviders(w http.ResponseWriter, r *http.Request) {
	providers, err := a.store.ListProviders(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, err)
		return
	}
	writeJSON(w, http.StatusOK, providers)
}

func (a *App) listRegions(w http.ResponseWriter, r *http.Request) {
	regions, err := a.store.ListRegions(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, err)
		return
	}
	writeJSON(w, http.StatusOK, regions)
}

func (a *App) listNodes(w http.ResponseWriter, r *http.Request) {
	nodes, err := a.store.ListNodes(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, err)
		return
	}
	writeJSON(w, http.StatusOK, nodes)
}

func (a *App) getNode(w http.ResponseWriter, r *http.Request) {
	node, err := a.store.Node(r.Context(), chi.URLParam(r, "nodeId"))
	if errors.Is(err, ErrNotFound) {
		writeError(w, http.StatusNotFound, errors.New("node not found"))
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, err)
		return
	}
	writeJSON(w, http.StatusOK, node)
}

func (a *App) createBootstrapToken(w http.ResponseWriter, r *http.Request) {
	claims := claimsFromContext(r.Context())
	token, err := a.store.CreateBootstrapToken(r.Context(), claims.TenantID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err)
		return
	}
	if err := a.store.Audit(r.Context(), "node.bootstrap_token.create", claims.Subject, claims.TenantID, map[string]any{
		"expiresAt": token.ExpiresAt,
	}); err != nil {
		writeError(w, http.StatusInternalServerError, err)
		return
	}
	writeJSON(w, http.StatusCreated, token)
}

func (a *App) listCapabilities(w http.ResponseWriter, r *http.Request) {
	capabilities, err := a.store.ListCapabilities(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, err)
		return
	}
	writeJSON(w, http.StatusOK, capabilities)
}

func (a *App) listAudit(w http.ResponseWriter, r *http.Request) {
	logs, err := a.store.ListAudit(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, err)
		return
	}
	writeJSON(w, http.StatusOK, logs)
}

func (a *App) listRollouts(w http.ResponseWriter, r *http.Request) {
	claims := claimsFromContext(r.Context())
	rollouts, err := a.store.ListRollouts(r.Context(), claims.TenantID, strings.TrimSpace(r.URL.Query().Get("nodeId")))
	if err != nil {
		writeError(w, http.StatusInternalServerError, err)
		return
	}
	writeJSON(w, http.StatusOK, rollouts)
}

func (a *App) createRollout(w http.ResponseWriter, r *http.Request) {
	var req struct {
		NodeID      string         `json:"nodeId"`
		AdapterName string         `json:"adapterName"`
		Config      map[string]any `json:"config"`
		Note        string         `json:"note"`
	}
	if err := decode(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, err)
		return
	}
	if strings.TrimSpace(req.NodeID) == "" {
		writeError(w, http.StatusBadRequest, errors.New("nodeId is required"))
		return
	}
	if req.AdapterName == "" {
		req.AdapterName = "xray-adapter"
	}
	if req.AdapterName != "xray-adapter" {
		writeError(w, http.StatusBadRequest, errors.New("only xray-adapter is supported in this phase"))
		return
	}
	if req.Config == nil {
		writeError(w, http.StatusBadRequest, errors.New("config is required"))
		return
	}
	claims := claimsFromContext(r.Context())
	rollout, err := a.store.CreateRollout(
		r.Context(),
		claims.TenantID,
		strings.TrimSpace(req.NodeID),
		claims.Subject,
		req.AdapterName,
		req.Config,
		req.Note,
	)
	if errors.Is(err, ErrNotFound) {
		writeError(w, http.StatusNotFound, errors.New("node not found"))
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, err)
		return
	}
	if err := a.store.Audit(r.Context(), "rollout.create", claims.Subject, claims.TenantID, map[string]any{
		"rolloutId":     rollout.ID,
		"nodeId":        rollout.NodeID,
		"bundleVersion": rollout.BundleVersion,
		"adapterName":   rollout.AdapterName,
	}); err != nil {
		writeError(w, http.StatusInternalServerError, err)
		return
	}
	writeJSON(w, http.StatusCreated, rollout)
}

func (a *App) getRollout(w http.ResponseWriter, r *http.Request) {
	claims := claimsFromContext(r.Context())
	rollout, err := a.store.Rollout(r.Context(), claims.TenantID, chi.URLParam(r, "rolloutId"))
	if errors.Is(err, ErrNotFound) {
		writeError(w, http.StatusNotFound, errors.New("rollout not found"))
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, err)
		return
	}
	writeJSON(w, http.StatusOK, rollout)
}

func (a *App) rollbackRollout(w http.ResponseWriter, r *http.Request) {
	claims := claimsFromContext(r.Context())
	rollout, err := a.store.RollbackRollout(r.Context(), claims.TenantID, chi.URLParam(r, "rolloutId"), claims.Subject)
	if errors.Is(err, ErrNotFound) {
		writeError(w, http.StatusNotFound, errors.New("rollout not found"))
		return
	}
	if errors.Is(err, ErrConflict) {
		writeError(w, http.StatusConflict, errors.New("rollout cannot be rolled back"))
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, err)
		return
	}
	if err := a.store.Audit(r.Context(), "rollout.rollback.create", claims.Subject, claims.TenantID, map[string]any{
		"rolloutId":           rollout.ID,
		"rollbackOfRolloutId": rollout.RollbackOfRolloutID,
		"nodeId":              rollout.NodeID,
		"bundleVersion":       rollout.BundleVersion,
	}); err != nil {
		writeError(w, http.StatusInternalServerError, err)
		return
	}
	writeJSON(w, http.StatusCreated, rollout)
}

func (a *App) agentRegister(w http.ResponseWriter, r *http.Request) {
	var req struct {
		BootstrapToken string `json:"bootstrapToken"`
	}
	if err := decode(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, err)
		return
	}
	node, err := a.store.RegisterNode(r.Context(), req.BootstrapToken)
	if errors.Is(err, ErrNotFound) {
		writeError(w, http.StatusUnauthorized, errors.New("invalid bootstrap token"))
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, err)
		return
	}
	writeJSON(w, http.StatusCreated, node)
}

func (a *App) agentConfigNext(w http.ResponseWriter, r *http.Request) {
	var req struct {
		NodeID               string `json:"nodeId"`
		CurrentConfigVersion int    `json:"currentConfigVersion"`
		AgentVersion         string `json:"agentVersion"`
		RuntimeVersion       string `json:"runtimeVersion"`
	}
	if err := decode(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, err)
		return
	}
	if strings.TrimSpace(req.NodeID) == "" {
		writeError(w, http.StatusBadRequest, errors.New("nodeId is required"))
		return
	}
	if req.AgentVersion == "" {
		req.AgentVersion = "0.1.0"
	}
	if req.RuntimeVersion == "" {
		req.RuntimeVersion = "0.1.0"
	}
	bundle, err := a.store.NextConfig(r.Context(), strings.TrimSpace(req.NodeID), req.CurrentConfigVersion, req.AgentVersion, req.RuntimeVersion)
	if errors.Is(err, ErrNotFound) {
		w.WriteHeader(http.StatusNoContent)
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, err)
		return
	}
	if bundle == nil {
		w.WriteHeader(http.StatusNoContent)
		return
	}
	writeJSON(w, http.StatusOK, bundle)
}

func (a *App) agentConfigReport(w http.ResponseWriter, r *http.Request) {
	var req struct {
		NodeID         string `json:"nodeId"`
		BundleVersion  int    `json:"bundleVersion"`
		Status         string `json:"status"`
		Message        string `json:"message"`
		HealthStatus   string `json:"healthStatus"`
		HealthScore    int    `json:"healthScore"`
		AgentVersion   string `json:"agentVersion"`
		RuntimeVersion string `json:"runtimeVersion"`
	}
	if err := decode(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, err)
		return
	}
	if strings.TrimSpace(req.NodeID) == "" || req.BundleVersion <= 0 {
		writeError(w, http.StatusBadRequest, errors.New("nodeId and bundleVersion are required"))
		return
	}
	switch req.Status {
	case "in_progress", "succeeded", "failed", "rolled_back":
	default:
		writeError(w, http.StatusBadRequest, errors.New("invalid config report status"))
		return
	}
	if req.AgentVersion == "" {
		req.AgentVersion = "0.1.0"
	}
	if req.RuntimeVersion == "" {
		req.RuntimeVersion = "0.1.0"
	}
	if req.HealthStatus == "" {
		req.HealthStatus = "offline"
	}
	report, err := a.store.ReportConfig(
		r.Context(),
		strings.TrimSpace(req.NodeID),
		req.BundleVersion,
		req.Status,
		req.Message,
		req.HealthStatus,
		req.HealthScore,
		req.AgentVersion,
		req.RuntimeVersion,
	)
	if errors.Is(err, ErrNotFound) {
		writeError(w, http.StatusNotFound, errors.New("rollout not found"))
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, err)
		return
	}
	if err := a.store.Audit(r.Context(), report.Action, "", report.TenantID, report.Metadata); err != nil {
		writeError(w, http.StatusInternalServerError, err)
		return
	}
	w.WriteHeader(http.StatusAccepted)
}

func (a *App) accepted(w http.ResponseWriter, r *http.Request) {
	switch r.URL.Path {
	case "/v1/agent/renew":
		var req struct {
			NodeID string `json:"nodeId"`
		}
		if err := decode(r, &req); err != nil {
			writeError(w, http.StatusBadRequest, err)
			return
		}
		if err := a.store.RenewNode(r.Context(), req.NodeID); err != nil && !errors.Is(err, ErrNotFound) {
			writeError(w, http.StatusInternalServerError, err)
			return
		}
	case "/v1/agent/heartbeat":
		var req struct {
			NodeID string `json:"nodeId"`
			Status string `json:"status"`
		}
		if err := decode(r, &req); err != nil {
			writeError(w, http.StatusBadRequest, err)
			return
		}
		if err := a.store.HeartbeatNode(r.Context(), req.NodeID); err != nil && !errors.Is(err, ErrNotFound) {
			writeError(w, http.StatusInternalServerError, err)
			return
		}
	case "/v1/agent/capabilities":
		var manifest map[string]any
		if err := decode(r, &manifest); err != nil {
			writeError(w, http.StatusBadRequest, err)
			return
		}
		nodeID, _ := manifest["nodeId"].(string)
		if err := a.store.SaveNodeCapabilities(r.Context(), nodeID, manifest); err != nil && !errors.Is(err, ErrNotFound) {
			writeError(w, http.StatusInternalServerError, err)
			return
		}
	}
	w.WriteHeader(http.StatusAccepted)
}

func (a *App) issueTokens(userID string, tenantID string, sessionID string, roles []string) (AuthTokens, error) {
	now := time.Now()
	claims := HugeEdgeClaims{
		TenantID:  tenantID,
		RoleIDs:   roles,
		SessionID: sessionID,
		TokenType: "access",
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   userID,
			ExpiresAt: jwt.NewNumericDate(now.Add(15 * time.Minute)),
			IssuedAt:  jwt.NewNumericDate(now),
		},
	}
	access, err := jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString([]byte(a.cfg.JWTSecret))
	if err != nil {
		return AuthTokens{}, err
	}
	return AuthTokens{AccessToken: access, RefreshToken: uuid.NewString(), ExpiresIn: 900}, nil
}

func (a *App) authMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		header := r.Header.Get("Authorization")
		tokenText := strings.TrimPrefix(header, "Bearer ")
		if tokenText == header || tokenText == "" {
			writeError(w, http.StatusUnauthorized, errors.New("missing bearer token"))
			return
		}
		var claims HugeEdgeClaims
		token, err := jwt.ParseWithClaims(tokenText, &claims, func(_ *jwt.Token) (any, error) {
			return []byte(a.cfg.JWTSecret), nil
		})
		if err != nil || !token.Valid || claims.TokenType != "access" {
			writeError(w, http.StatusUnauthorized, errors.New("invalid token"))
			return
		}
		next.ServeHTTP(w, r.WithContext(contextWithClaims(r.Context(), &claims)))
	})
}

func (a *App) optionalClaims(r *http.Request) (*HugeEdgeClaims, bool) {
	header := r.Header.Get("Authorization")
	tokenText := strings.TrimPrefix(header, "Bearer ")
	if tokenText == header || tokenText == "" {
		return nil, false
	}
	var claims HugeEdgeClaims
	token, err := jwt.ParseWithClaims(tokenText, &claims, func(_ *jwt.Token) (any, error) {
		return []byte(a.cfg.JWTSecret), nil
	})
	if err != nil || !token.Valid || claims.TokenType != "access" {
		return nil, false
	}
	return &claims, true
}

func decode(r *http.Request, out any) error {
	defer r.Body.Close()
	return json.NewDecoder(r.Body).Decode(out)
}

func writeJSON(w http.ResponseWriter, status int, body any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(body)
}

func writeError(w http.ResponseWriter, status int, err error) {
	writeJSON(w, status, map[string]string{"error": err.Error()})
}
