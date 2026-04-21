package platform

import (
	"encoding/json"
	"errors"
	"net/http"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	heauth "github.com/hugeedge/hugeedge/internal/auth"
	"github.com/rs/cors"
)

type App struct {
	cfg   Config
	deps  Dependencies
	store *Store
}

func NewApp(cfg Config) *App {
	return &App{cfg: cfg, deps: Dependencies{Tracer: BootstrapTelemetry("hugeedge-api")}, store: NewStore()}
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
			r.Get("/admin/capabilities", a.listCapabilities)
			r.Get("/admin/audit-logs", a.listAudit)
		})

		r.Post("/agent/register", a.agentRegister)
		r.Post("/agent/renew", a.accepted)
		r.Post("/agent/heartbeat", a.accepted)
		r.Post("/agent/capabilities", a.accepted)
	})

	return cors.AllowAll().Handler(r)
}

func (a *App) health(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (a *App) ready(w http.ResponseWriter, _ *http.Request) {
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
	passwordHash, err := heauth.HashPassword(req.Password)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err)
		return
	}
	user, ok := a.store.FindOrCreateUser(req.Email, req.Password, passwordHash)
	if !ok {
		writeError(w, http.StatusUnauthorized, errors.New("invalid credentials"))
		return
	}
	session := a.store.CreateSession(user.ID, a.store.DefaultTenantID)
	tokens, err := a.issueTokens(user.ID, a.store.DefaultTenantID, session.ID, []string{"owner"})
	if err != nil {
		writeError(w, http.StatusInternalServerError, err)
		return
	}
	a.store.SaveRefreshToken(tokens.RefreshToken, session.ID, user.ID)
	a.store.Audit("auth.login", user.ID, a.store.DefaultTenantID)
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
	record, ok := a.store.RotateRefreshToken(req.RefreshToken)
	if !ok {
		writeError(w, http.StatusUnauthorized, errors.New("invalid refresh token"))
		return
	}
	tokens, err := a.issueTokens(record.UserID, a.store.DefaultTenantID, record.SessionID, []string{"owner"})
	if err != nil {
		writeError(w, http.StatusInternalServerError, err)
		return
	}
	a.store.SaveRefreshToken(tokens.RefreshToken, record.SessionID, record.UserID)
	writeJSON(w, http.StatusOK, tokens)
}

func (a *App) logout(w http.ResponseWriter, _ *http.Request) {
	w.WriteHeader(http.StatusNoContent)
}

func (a *App) me(w http.ResponseWriter, r *http.Request) {
	claims := claimsFromContext(r.Context())
	user := a.store.User(claims.Subject)
	writeJSON(w, http.StatusOK, map[string]any{
		"id":        claims.Subject,
		"email":     user.Email,
		"tenantId":  claims.TenantID,
		"roleIds":   claims.RoleIDs,
		"sessionId": claims.SessionID,
	})
}

func (a *App) listTenants(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, a.store.ListTenants())
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
	claims := claimsFromContext(r.Context())
	tenant := a.store.CreateTenant(req.Name, req.Slug)
	a.store.Audit("tenant.create", claims.Subject, tenant.ID)
	writeJSON(w, http.StatusCreated, tenant)
}

func (a *App) getTenant(w http.ResponseWriter, r *http.Request) {
	tenant, ok := a.store.Tenant(chi.URLParam(r, "tenantId"))
	if !ok {
		writeError(w, http.StatusNotFound, errors.New("tenant not found"))
		return
	}
	writeJSON(w, http.StatusOK, tenant)
}

func (a *App) listProviders(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, a.store.providers)
}

func (a *App) listRegions(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, a.store.regions)
}

func (a *App) listNodes(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, a.store.ListNodes())
}

func (a *App) getNode(w http.ResponseWriter, r *http.Request) {
	node, ok := a.store.Node(chi.URLParam(r, "nodeId"))
	if !ok {
		writeError(w, http.StatusNotFound, errors.New("node not found"))
		return
	}
	writeJSON(w, http.StatusOK, node)
}

func (a *App) createBootstrapToken(w http.ResponseWriter, r *http.Request) {
	claims := claimsFromContext(r.Context())
	token := a.store.CreateBootstrapToken(claims.TenantID)
	a.store.Audit("node.bootstrap_token.create", claims.Subject, claims.TenantID)
	writeJSON(w, http.StatusCreated, token)
}

func (a *App) listCapabilities(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, a.store.capabilities)
}

func (a *App) listAudit(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, a.store.ListAudit())
}

func (a *App) agentRegister(w http.ResponseWriter, r *http.Request) {
	node := a.store.RegisterNode()
	writeJSON(w, http.StatusCreated, node)
}

func (a *App) accepted(w http.ResponseWriter, _ *http.Request) {
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
