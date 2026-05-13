package platform

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"

	heauth "github.com/hugeedge/hugeedge/internal/auth"
	platformdb "github.com/hugeedge/hugeedge/internal/platform/db"
)

var (
	ErrConflict            = errors.New("conflict")
	ErrInvalidCredentials  = errors.New("invalid credentials")
	ErrInvalidRefreshToken = errors.New("invalid refresh token")
	ErrNotFound            = errors.New("not found")
)

type Store struct {
	db           *pgxpool.Pool
	queries      *platformdb.Queries
	capabilities []Capability
}

type Principal struct {
	UserID         string
	Email          string
	AccountID      string
	AccountRoleIDs []string
	BillingScope   string
	TenantID       string
	RoleIDs        []string
	SessionID      string
}

type User struct {
	ID           string `json:"id"`
	Email        string `json:"email"`
	PasswordHash string `json:"-"`
}

type Tenant struct {
	ID        string    `json:"id"`
	Name      string    `json:"name"`
	Slug      string    `json:"slug"`
	Status    string    `json:"status"`
	CreatedAt time.Time `json:"createdAt"`
}

type Node struct {
	ID                   string     `json:"id"`
	TenantID             string     `json:"tenantId"`
	Name                 string     `json:"name"`
	Status               string     `json:"status"`
	AdapterName          string     `json:"adapterName"`
	AgentVersion         string     `json:"agentVersion"`
	RuntimeVersion       string     `json:"runtimeVersion"`
	HealthStatus         string     `json:"healthStatus"`
	HealthScore          int        `json:"healthScore"`
	CurrentConfigVersion *int       `json:"currentConfigVersion,omitempty"`
	DesiredConfigVersion *int       `json:"desiredConfigVersion,omitempty"`
	LastApplyStatus      string     `json:"lastApplyStatus,omitempty"`
	LastApplyMessage     string     `json:"lastApplyMessage,omitempty"`
	LastApplyAt          *time.Time `json:"lastApplyAt,omitempty"`
	LastHeartbeatAt      *time.Time `json:"lastHeartbeatAt,omitempty"`
	CreatedAt            time.Time  `json:"createdAt"`
}

type BootstrapToken struct {
	Token     string    `json:"token"`
	ExpiresAt time.Time `json:"expiresAt"`
}

type Capability struct {
	Name    string `json:"name"`
	Version string `json:"version"`
	Source  string `json:"source"`
}

type AuditLog struct {
	ID        string         `json:"id"`
	Action    string         `json:"action"`
	ActorID   string         `json:"actorId"`
	TenantID  string         `json:"tenantId,omitempty"`
	Metadata  map[string]any `json:"metadata,omitempty"`
	CreatedAt time.Time      `json:"createdAt"`
}

type Provider struct {
	ID   string `json:"id"`
	Name string `json:"name"`
	Slug string `json:"slug"`
}

type Region struct {
	ID         string `json:"id"`
	ProviderID string `json:"providerId"`
	Name       string `json:"name"`
	Code       string `json:"code"`
}

type Rollout struct {
	ID                  string         `json:"id"`
	TenantID            string         `json:"tenantId"`
	NodeID              string         `json:"nodeId"`
	NodeName            string         `json:"nodeName"`
	BundleVersion       int            `json:"bundleVersion"`
	Config              map[string]any `json:"config,omitempty"`
	Hash                string         `json:"hash"`
	AdapterName         string         `json:"adapterName"`
	Status              string         `json:"status"`
	Note                string         `json:"note"`
	CreatedBy           string         `json:"createdBy,omitempty"`
	RollbackOfRolloutID string         `json:"rollbackOfRolloutId,omitempty"`
	CreatedAt           time.Time      `json:"createdAt"`
	CompletedAt         *time.Time     `json:"completedAt,omitempty"`
	LastApplyStatus     string         `json:"lastApplyStatus,omitempty"`
	LastApplyMessage    string         `json:"lastApplyMessage,omitempty"`
	HealthStatus        string         `json:"healthStatus,omitempty"`
	HealthScore         int            `json:"healthScore,omitempty"`
	AgentVersion        string         `json:"agentVersion,omitempty"`
	RuntimeVersion      string         `json:"runtimeVersion,omitempty"`
}

type ConfigBundle struct {
	BundleVersion int            `json:"bundleVersion"`
	AdapterName   string         `json:"adapterName"`
	Config        map[string]any `json:"config"`
	Hash          string         `json:"hash"`
	IssuedAt      time.Time      `json:"issuedAt"`
}

type ConfigReport struct {
	TenantID string
	Action   string
	Metadata map[string]any
}

func NewStore(db *pgxpool.Pool) *Store {
	return &Store{
		db:      db,
		queries: platformdb.New(db),
		capabilities: []Capability{
			{Name: "agent.register", Version: "0.1.0", Source: "core"},
			{Name: "adapter.xray", Version: "0.1.0", Source: "xray-adapter"},
			{Name: "wasm.runtime.wasmedge", Version: "0.1.0", Source: "contract"},
			{Name: "ebpf.fallback", Version: "0.1.0", Source: "contract"},
		},
	}
}

func (s *Store) Ping(ctx context.Context) error {
	return s.db.Ping(ctx)
}

func (s *Store) Close() {
	s.db.Close()
}

func (s *Store) AuthenticateOrBootstrap(ctx context.Context, email string, password string) (Principal, error) {
	email = strings.TrimSpace(strings.ToLower(email))
	if email == "" || password == "" {
		return Principal{}, ErrInvalidCredentials
	}

	tx, err := s.db.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return Principal{}, err
	}
	defer rollback(ctx, tx)

	var userCount int
	if err := tx.QueryRow(ctx, `SELECT count(*) FROM users`).Scan(&userCount); err != nil {
		return Principal{}, err
	}

	var user User
	if userCount == 0 {
		passwordHash, err := heauth.HashPassword(password)
		if err != nil {
			return Principal{}, err
		}
		principal, err := s.bootstrapFirstAdmin(ctx, tx, email, passwordHash)
		if err != nil {
			return Principal{}, err
		}
		if err := tx.Commit(ctx); err != nil {
			return Principal{}, err
		}
		return principal, nil
	}

	err = tx.QueryRow(ctx, `SELECT id::text, email, COALESCE(password_hash, '') FROM users WHERE email = $1`, email).
		Scan(&user.ID, &user.Email, &user.PasswordHash)
	if errors.Is(err, pgx.ErrNoRows) {
		return Principal{}, ErrInvalidCredentials
	}
	if err != nil {
		return Principal{}, err
	}
	if !heauth.VerifyPassword(user.PasswordHash, password) {
		return Principal{}, ErrInvalidCredentials
	}

	principal, err := s.createSessionPrincipal(ctx, tx, user.ID, user.Email)
	if err != nil {
		return Principal{}, err
	}
	if err := tx.Commit(ctx); err != nil {
		return Principal{}, err
	}
	return principal, nil
}

func (s *Store) bootstrapFirstAdmin(ctx context.Context, tx pgx.Tx, email string, passwordHash string) (Principal, error) {
	tenantID := uuid.NewString()
	roleID := uuid.NewString()
	userID := uuid.NewString()
	membershipID := uuid.NewString()
	accountID := uuid.NewString()
	accountMembershipID := uuid.NewString()
	accountName := strings.TrimSpace(strings.Split(email, "@")[0])
	if accountName == "" {
		accountName = "Default Account"
	}
	accountSlug := uniqueSlugFromParts(accountName, userID[:8])

	if _, err := tx.Exec(ctx,
		`INSERT INTO accounts (id, type, name, slug, status, billing_email) VALUES ($1, 'individual', $2, $3, 'active', $4)`,
		accountID, accountName, accountSlug, email,
	); err != nil {
		return Principal{}, err
	}
	if _, err := tx.Exec(ctx,
		`INSERT INTO tenants (id, account_id, name, slug, status) VALUES ($1, $2, 'Default Tenant', 'default', 'active')`,
		tenantID, accountID,
	); err != nil {
		return Principal{}, err
	}
	if _, err := tx.Exec(ctx,
		`UPDATE accounts SET default_tenant_id = $2, updated_at = now() WHERE id = $1`,
		accountID, tenantID,
	); err != nil {
		return Principal{}, err
	}
	if _, err := tx.Exec(ctx,
		`INSERT INTO roles (id, tenant_id, name, permissions) VALUES ($1, $2, 'owner', '["*"]'::jsonb)`,
		roleID, tenantID,
	); err != nil {
		return Principal{}, err
	}
	if _, err := tx.Exec(ctx,
		`INSERT INTO users (id, email, password_hash) VALUES ($1, $2, $3)`,
		userID, email, passwordHash,
	); err != nil {
		return Principal{}, err
	}
	if _, err := tx.Exec(ctx,
		`INSERT INTO memberships (id, tenant_id, user_id, role_id) VALUES ($1, $2, $3, $4)`,
		membershipID, tenantID, userID, roleID,
	); err != nil {
		return Principal{}, err
	}
	if _, err := tx.Exec(ctx,
		`INSERT INTO account_memberships (id, account_id, user_id, role_name) VALUES ($1, $2, $3, 'account_owner')`,
		accountMembershipID, accountID, userID,
	); err != nil {
		return Principal{}, err
	}
	if _, err := tx.Exec(ctx,
		`INSERT INTO wallets (id, account_id, currency, balance_minor) VALUES ($1, $2, 'USD', 0)`,
		uuid.NewString(), accountID,
	); err != nil {
		return Principal{}, err
	}
	if err := s.bootstrapCommerceForAccount(ctx, tx, accountID, tenantID); err != nil {
		return Principal{}, err
	}

	principal, err := s.createSessionPrincipal(ctx, tx, userID, email)
	if err != nil {
		return Principal{}, err
	}
	return principal, nil
}

func (s *Store) createSessionPrincipal(ctx context.Context, tx pgx.Tx, userID string, email string) (Principal, error) {
	var tenantID string
	rows, err := tx.Query(ctx,
		`SELECT m.tenant_id::text, m.role_id::text
		 FROM memberships m
		 WHERE m.user_id = $1
		 ORDER BY m.created_at ASC`,
		userID,
	)
	if err != nil {
		return Principal{}, err
	}
	defer rows.Close()

	roleIDs := []string{}
	for rows.Next() {
		var currentTenantID string
		var roleID string
		if err := rows.Scan(&currentTenantID, &roleID); err != nil {
			return Principal{}, err
		}
		if tenantID == "" {
			tenantID = currentTenantID
		}
		if currentTenantID == tenantID {
			roleIDs = append(roleIDs, roleID)
		}
	}
	if err := rows.Err(); err != nil {
		return Principal{}, err
	}
	if tenantID == "" {
		return Principal{}, ErrInvalidCredentials
	}

	sessionID := uuid.NewString()
	if _, err := tx.Exec(ctx,
		`INSERT INTO user_sessions (id, user_id, expires_at) VALUES ($1, $2, $3)`,
		sessionID, userID, time.Now().Add(24*time.Hour),
	); err != nil {
		return Principal{}, err
	}

	accountID, accountRoleIDs, billingScope, err := s.accountContextForUser(ctx, tx, userID, tenantID)
	if err != nil {
		return Principal{}, err
	}

	return Principal{
		UserID:         userID,
		Email:          email,
		AccountID:      accountID,
		AccountRoleIDs: accountRoleIDs,
		BillingScope:   billingScope,
		TenantID:       tenantID,
		RoleIDs:        roleIDs,
		SessionID:      sessionID,
	}, nil
}

func (s *Store) SaveRefreshToken(ctx context.Context, token string, sessionID string) error {
	_, err := s.db.Exec(ctx,
		`INSERT INTO refresh_tokens (id, user_session_id, token_hash, expires_at) VALUES ($1, $2, $3, $4)`,
		uuid.NewString(), sessionID, tokenHash(token), time.Now().Add(30*24*time.Hour),
	)
	return err
}

func (s *Store) RotateRefreshToken(ctx context.Context, token string) (Principal, error) {
	tx, err := s.db.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return Principal{}, err
	}
	defer rollback(ctx, tx)

	var sessionID string
	var userID string
	var email string
	err = tx.QueryRow(ctx,
		`SELECT us.id::text, u.id::text, u.email
		 FROM refresh_tokens rt
		 JOIN user_sessions us ON us.id = rt.user_session_id
		 JOIN users u ON u.id = us.user_id
		 WHERE rt.token_hash = $1
		   AND rt.rotated_at IS NULL
		   AND rt.expires_at > now()
		   AND (us.expires_at IS NULL OR us.expires_at > now())
		 FOR UPDATE`,
		tokenHash(token),
	).Scan(&sessionID, &userID, &email)
	if errors.Is(err, pgx.ErrNoRows) {
		return Principal{}, ErrInvalidRefreshToken
	}
	if err != nil {
		return Principal{}, err
	}

	if _, err := tx.Exec(ctx, `UPDATE refresh_tokens SET rotated_at = now() WHERE token_hash = $1`, tokenHash(token)); err != nil {
		return Principal{}, err
	}

	principal, err := s.principalForSession(ctx, tx, userID, email, sessionID)
	if err != nil {
		return Principal{}, err
	}
	if err := tx.Commit(ctx); err != nil {
		return Principal{}, err
	}
	return principal, nil
}

func (s *Store) principalForSession(ctx context.Context, tx pgx.Tx, userID string, email string, sessionID string) (Principal, error) {
	var tenantID string
	rows, err := tx.Query(ctx,
		`SELECT m.tenant_id::text, m.role_id::text
		 FROM memberships m
		 WHERE m.user_id = $1
		 ORDER BY m.created_at ASC`,
		userID,
	)
	if err != nil {
		return Principal{}, err
	}
	defer rows.Close()

	roleIDs := []string{}
	for rows.Next() {
		var currentTenantID string
		var roleID string
		if err := rows.Scan(&currentTenantID, &roleID); err != nil {
			return Principal{}, err
		}
		if tenantID == "" {
			tenantID = currentTenantID
		}
		if currentTenantID == tenantID {
			roleIDs = append(roleIDs, roleID)
		}
	}
	if err := rows.Err(); err != nil {
		return Principal{}, err
	}
	if tenantID == "" {
		return Principal{}, ErrInvalidRefreshToken
	}
	accountID, accountRoleIDs, billingScope, err := s.accountContextForUser(ctx, tx, userID, tenantID)
	if err != nil {
		return Principal{}, err
	}
	return Principal{
		UserID:         userID,
		Email:          email,
		AccountID:      accountID,
		AccountRoleIDs: accountRoleIDs,
		BillingScope:   billingScope,
		TenantID:       tenantID,
		RoleIDs:        roleIDs,
		SessionID:      sessionID,
	}, nil
}

func (s *Store) RevokeSession(ctx context.Context, sessionID string) error {
	_, err := s.db.Exec(ctx,
		`UPDATE refresh_tokens SET rotated_at = now() WHERE user_session_id = $1 AND rotated_at IS NULL`,
		sessionID,
	)
	return err
}

func (s *Store) User(ctx context.Context, id string) (User, error) {
	var user User
	err := s.db.QueryRow(ctx, `SELECT id::text, email, COALESCE(password_hash, '') FROM users WHERE id = $1`, id).
		Scan(&user.ID, &user.Email, &user.PasswordHash)
	if errors.Is(err, pgx.ErrNoRows) {
		return User{}, ErrNotFound
	}
	return user, err
}

func (s *Store) ListTenants(ctx context.Context) ([]Tenant, error) {
	rows, err := s.queries.ListTenants(ctx)
	if err != nil {
		return nil, err
	}

	tenants := make([]Tenant, 0, len(rows))
	for _, row := range rows {
		tenants = append(tenants, Tenant{
			ID:        uuidString(row.ID),
			Name:      row.Name,
			Slug:      row.Slug,
			Status:    row.Status,
			CreatedAt: timeFromTimestamptz(row.CreatedAt),
		})
	}
	return tenants, nil
}

func (s *Store) CreateTenant(ctx context.Context, name string, slug string) (Tenant, error) {
	var tenant Tenant
	err := s.db.QueryRow(ctx,
		`INSERT INTO tenants (id, name, slug, status)
		 VALUES ($1, $2, $3, 'active')
		 RETURNING id::text, name, slug, status, created_at`,
		uuid.NewString(), strings.TrimSpace(name), strings.TrimSpace(slug),
	).Scan(&tenant.ID, &tenant.Name, &tenant.Slug, &tenant.Status, &tenant.CreatedAt)
	if isUniqueViolation(err) {
		return Tenant{}, ErrConflict
	}
	return tenant, err
}

func (s *Store) Tenant(ctx context.Context, id string) (Tenant, error) {
	tenantID, err := uuidParam(id)
	if err != nil {
		return Tenant{}, err
	}
	row, err := s.queries.GetTenant(ctx, tenantID)
	if errors.Is(err, pgx.ErrNoRows) {
		return Tenant{}, ErrNotFound
	}
	if err != nil {
		return Tenant{}, err
	}
	return Tenant{
		ID:        uuidString(row.ID),
		Name:      row.Name,
		Slug:      row.Slug,
		Status:    row.Status,
		CreatedAt: timeFromTimestamptz(row.CreatedAt),
	}, nil
}

func (s *Store) ListProviders(ctx context.Context) ([]Provider, error) {
	rows, err := s.db.Query(ctx, `SELECT id::text, name, slug FROM providers ORDER BY name ASC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var providers []Provider
	for rows.Next() {
		var provider Provider
		if err := rows.Scan(&provider.ID, &provider.Name, &provider.Slug); err != nil {
			return nil, err
		}
		providers = append(providers, provider)
	}
	return providers, rows.Err()
}

func (s *Store) ListRegions(ctx context.Context) ([]Region, error) {
	rows, err := s.db.Query(ctx, `SELECT id::text, provider_id::text, name, code FROM regions ORDER BY provider_id, code ASC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var regions []Region
	for rows.Next() {
		var region Region
		if err := rows.Scan(&region.ID, &region.ProviderID, &region.Name, &region.Code); err != nil {
			return nil, err
		}
		regions = append(regions, region)
	}
	return regions, rows.Err()
}

func (s *Store) ListNodes(ctx context.Context) ([]Node, error) {
	rows, err := s.queries.ListNodes(ctx)
	if err != nil {
		return nil, err
	}

	nodes := make([]Node, 0, len(rows))
	for _, row := range rows {
		nodes = append(nodes, Node{
			ID:                   uuidString(row.ID),
			TenantID:             uuidString(row.TenantID),
			Name:                 row.Name,
			Status:               row.Status,
			AdapterName:          row.AdapterName,
			AgentVersion:         row.AgentVersion,
			RuntimeVersion:       row.RuntimeVersion,
			HealthStatus:         row.HealthStatus,
			HealthScore:          int(row.HealthScore),
			CurrentConfigVersion: intPtrFromInt4(row.CurrentConfigVersion),
			DesiredConfigVersion: intPtrFromInt4(row.DesiredConfigVersion),
			LastApplyStatus:      textFromText(row.LastApplyStatus),
			LastApplyMessage:     textFromText(row.LastApplyMessage),
			LastApplyAt:          timePtrFromTimestamptz(row.LastApplyAt),
			LastHeartbeatAt:      timePtrFromTimestamptz(row.LastHeartbeatAt),
			CreatedAt:            timeFromTimestamptz(row.CreatedAt),
		})
	}
	return nodes, nil
}

func (s *Store) Node(ctx context.Context, id string) (Node, error) {
	nodeID, err := uuidParam(id)
	if err != nil {
		return Node{}, err
	}
	row, err := s.queries.GetNode(ctx, nodeID)
	if errors.Is(err, pgx.ErrNoRows) {
		return Node{}, ErrNotFound
	}
	if err != nil {
		return Node{}, err
	}
	return Node{
		ID:                   uuidString(row.ID),
		TenantID:             uuidString(row.TenantID),
		Name:                 row.Name,
		Status:               row.Status,
		AdapterName:          row.AdapterName,
		AgentVersion:         row.AgentVersion,
		RuntimeVersion:       row.RuntimeVersion,
		HealthStatus:         row.HealthStatus,
		HealthScore:          int(row.HealthScore),
		CurrentConfigVersion: intPtrFromInt4(row.CurrentConfigVersion),
		DesiredConfigVersion: intPtrFromInt4(row.DesiredConfigVersion),
		LastApplyStatus:      textFromText(row.LastApplyStatus),
		LastApplyMessage:     textFromText(row.LastApplyMessage),
		LastApplyAt:          timePtrFromTimestamptz(row.LastApplyAt),
		LastHeartbeatAt:      timePtrFromTimestamptz(row.LastHeartbeatAt),
		CreatedAt:            timeFromTimestamptz(row.CreatedAt),
	}, nil
}

func (s *Store) CreateBootstrapToken(ctx context.Context, tenantID string) (BootstrapToken, error) {
	token := uuid.NewString()
	expiresAt := time.Now().Add(time.Hour)
	_, err := s.db.Exec(ctx,
		`INSERT INTO bootstrap_tokens (id, tenant_id, token_hash, expires_at) VALUES ($1, $2, $3, $4)`,
		uuid.NewString(), tenantID, tokenHash(token), expiresAt,
	)
	if err != nil {
		return BootstrapToken{}, err
	}
	return BootstrapToken{Token: token, ExpiresAt: expiresAt}, nil
}

func (s *Store) ListCapabilities(context.Context) ([]Capability, error) {
	return append([]Capability(nil), s.capabilities...), nil
}

func (s *Store) ListAudit(ctx context.Context) ([]AuditLog, error) {
	rows, err := s.queries.ListAuditLogs(ctx, 100)
	if err != nil {
		return nil, err
	}

	logs := make([]AuditLog, 0, len(rows))
	for _, row := range rows {
		metadata := map[string]any{}
		if len(row.Metadata) > 0 {
			if err := json.Unmarshal(row.Metadata, &metadata); err != nil {
				return nil, err
			}
		}
		logs = append(logs, AuditLog{
			ID:        uuidString(row.ID),
			ActorID:   uuidString(row.ActorID),
			TenantID:  uuidString(row.TenantID),
			Metadata:  metadata,
			Action:    row.Action,
			CreatedAt: timeFromTimestamptz(row.CreatedAt),
		})
	}
	return logs, nil
}

func (s *Store) Audit(ctx context.Context, action string, actorID string, tenantID string, metadata map[string]any) error {
	if metadata == nil {
		metadata = map[string]any{}
	}
	metadataJSON, err := json.Marshal(metadata)
	if err != nil {
		return err
	}
	_, err = s.db.Exec(ctx,
		`INSERT INTO audit_logs (id, actor_id, tenant_id, action, metadata) VALUES ($1, nullif($2, '')::uuid, nullif($3, '')::uuid, $4, $5)`,
		uuid.NewString(), actorID, tenantID, action, metadataJSON,
	)
	return err
}

func (s *Store) RegisterNode(ctx context.Context, bootstrapToken string) (Node, error) {
	tx, err := s.db.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return Node{}, err
	}
	defer rollback(ctx, tx)

	tenantID, err := s.consumeBootstrapToken(ctx, tx, bootstrapToken)
	if err != nil {
		return Node{}, err
	}

	var count int
	if err := tx.QueryRow(ctx, `SELECT count(*) FROM nodes WHERE tenant_id = $1`, tenantID).Scan(&count); err != nil {
		return Node{}, err
	}

	var node Node
	err = tx.QueryRow(ctx,
		`INSERT INTO nodes (id, tenant_id, name, status, adapter_name, agent_version, runtime_version, health_status, health_score)
		 VALUES ($1, $2, $3, 'registered', 'xray-adapter', '0.1.0', '0.1.0', 'offline', 0)
		 RETURNING id::text, tenant_id::text, name, status, adapter_name, agent_version, runtime_version, health_status, health_score, created_at`,
		uuid.NewString(), tenantID, fmt.Sprintf("agent-%d", count+1),
	).Scan(&node.ID, &node.TenantID, &node.Name, &node.Status, &node.AdapterName, &node.AgentVersion, &node.RuntimeVersion, &node.HealthStatus, &node.HealthScore, &node.CreatedAt)
	if err != nil {
		return Node{}, err
	}
	if _, err := tx.Exec(ctx, `INSERT INTO node_config_states (node_id) VALUES ($1) ON CONFLICT (node_id) DO NOTHING`, node.ID); err != nil {
		return Node{}, err
	}
	if err := tx.Commit(ctx); err != nil {
		return Node{}, err
	}
	return node, nil
}

func (s *Store) consumeBootstrapToken(ctx context.Context, tx pgx.Tx, bootstrapToken string) (string, error) {
	if bootstrapToken != "" {
		var tenantID string
		err := tx.QueryRow(ctx,
			`UPDATE bootstrap_tokens
			 SET used_at = now()
			 WHERE token_hash = $1
			   AND used_at IS NULL
			   AND expires_at > now()
			 RETURNING tenant_id::text`,
			tokenHash(bootstrapToken),
		).Scan(&tenantID)
		if errors.Is(err, pgx.ErrNoRows) && bootstrapToken != "local-bootstrap" {
			return "", ErrNotFound
		}
		if err == nil {
			return tenantID, nil
		}
		if err != nil && !errors.Is(err, pgx.ErrNoRows) {
			return "", err
		}
	}

	if bootstrapToken == "local-bootstrap" {
		var tokenCount int
		if err := tx.QueryRow(ctx, `SELECT count(*) FROM bootstrap_tokens WHERE used_at IS NULL AND expires_at > now()`).Scan(&tokenCount); err != nil {
			return "", err
		}
		if tokenCount == 0 {
			return s.ensureDefaultTenant(ctx, tx)
		}
	}

	return "", ErrNotFound
}

func (s *Store) ensureDefaultTenant(ctx context.Context, tx pgx.Tx) (string, error) {
	var tenantID string
	err := tx.QueryRow(ctx, `SELECT id::text FROM tenants ORDER BY created_at ASC LIMIT 1`).Scan(&tenantID)
	if err == nil {
		return tenantID, nil
	}
	if !errors.Is(err, pgx.ErrNoRows) {
		return "", err
	}

	tenantID = uuid.NewString()
	_, err = tx.Exec(ctx,
		`INSERT INTO tenants (id, name, slug, status) VALUES ($1, 'Default Tenant', 'default', 'active')`,
		tenantID,
	)
	if isUniqueViolation(err) {
		err = tx.QueryRow(ctx, `SELECT id::text FROM tenants WHERE slug = 'default'`).Scan(&tenantID)
	}
	return tenantID, err
}

func (s *Store) RenewNode(ctx context.Context, nodeID string) error {
	if nodeID == "" {
		return nil
	}
	tag, err := s.db.Exec(ctx, `UPDATE nodes SET status = 'registered' WHERE id = $1`, nodeID)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func (s *Store) HeartbeatNode(ctx context.Context, nodeID string) error {
	if nodeID == "" {
		return nil
	}
	tag, err := s.db.Exec(ctx,
		`UPDATE nodes
		 SET status = 'ready',
		     last_heartbeat_at = now(),
		     health_status = CASE
		       WHEN COALESCE((SELECT last_apply_status FROM node_config_states WHERE node_id = nodes.id), '') IN ('failed', 'rolled_back')
		         THEN 'degraded'
		       ELSE 'online'
		     END,
		     health_score = CASE
		       WHEN COALESCE((SELECT last_apply_status FROM node_config_states WHERE node_id = nodes.id), '') IN ('failed', 'rolled_back')
		         THEN 70
		       ELSE 100
		     END
		 WHERE id = $1`,
		nodeID,
	)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func (s *Store) SaveNodeCapabilities(ctx context.Context, nodeID string, manifest map[string]any) error {
	if nodeID == "" {
		return nil
	}
	capabilities, _ := manifest["capabilities"].([]any)
	if len(capabilities) == 0 {
		return nil
	}
	manifestJSON, err := json.Marshal(manifest)
	if err != nil {
		return err
	}

	tx, err := s.db.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return err
	}
	defer rollback(ctx, tx)

	for _, item := range capabilities {
		capability, ok := item.(map[string]any)
		if !ok {
			continue
		}
		name, _ := capability["name"].(string)
		version, _ := capability["version"].(string)
		if name == "" || version == "" {
			continue
		}
		if _, err := tx.Exec(ctx,
			`INSERT INTO node_capabilities (id, node_id, name, version, manifest) VALUES ($1, $2, $3, $4, $5)`,
			uuid.NewString(), nodeID, name, version, manifestJSON,
		); err != nil {
			return err
		}
	}
	return tx.Commit(ctx)
}

func tokenHash(token string) string {
	sum := sha256.Sum256([]byte(token))
	return hex.EncodeToString(sum[:])
}

func rollback(ctx context.Context, tx pgx.Tx) {
	_ = tx.Rollback(ctx)
}

func isUniqueViolation(err error) bool {
	var pgErr *pgconn.PgError
	return errors.As(err, &pgErr) && pgErr.Code == "23505"
}

func uuidParam(id string) (pgtype.UUID, error) {
	parsed, err := uuid.Parse(id)
	if err != nil {
		return pgtype.UUID{}, ErrNotFound
	}
	return pgtype.UUID{Bytes: parsed, Valid: true}, nil
}

func uuidString(value pgtype.UUID) string {
	if !value.Valid {
		return ""
	}
	return uuid.UUID(value.Bytes).String()
}

func timeFromTimestamptz(value pgtype.Timestamptz) time.Time {
	if !value.Valid {
		return time.Time{}
	}
	return value.Time
}

func timePtrFromTimestamptz(value pgtype.Timestamptz) *time.Time {
	if !value.Valid {
		return nil
	}
	return &value.Time
}

func intPtrFromInt4(value pgtype.Int4) *int {
	if !value.Valid {
		return nil
	}
	converted := int(value.Int32)
	return &converted
}

func intFromInt4(value pgtype.Int4) int {
	if !value.Valid {
		return 0
	}
	return int(value.Int32)
}

func textFromText(value pgtype.Text) string {
	if !value.Valid {
		return ""
	}
	return value.String
}
