package platform

import (
	"fmt"
	"sort"
	"sync"
	"time"

	"github.com/google/uuid"
	heauth "github.com/hugeedge/hugeedge/internal/auth"
)

type Store struct {
	mu              sync.RWMutex
	DefaultTenantID string
	users           map[string]User
	sessions        map[string]UserSession
	refreshTokens   map[string]RefreshToken
	tenants         map[string]Tenant
	nodes           map[string]Node
	audit           []AuditLog
	providers       []Provider
	regions         []Region
	capabilities    []Capability
}

type User struct {
	ID           string `json:"id"`
	Email        string `json:"email"`
	PasswordHash string `json:"-"`
}

type UserSession struct {
	ID     string `json:"id"`
	UserID string `json:"userId"`
}

type RefreshToken struct {
	Token     string `json:"token"`
	SessionID string `json:"sessionId"`
	UserID    string `json:"userId"`
}

type Tenant struct {
	ID        string    `json:"id"`
	Name      string    `json:"name"`
	Slug      string    `json:"slug"`
	Status    string    `json:"status"`
	CreatedAt time.Time `json:"createdAt"`
}

type Node struct {
	ID          string    `json:"id"`
	TenantID    string    `json:"tenantId"`
	Name        string    `json:"name"`
	Status      string    `json:"status"`
	AdapterName string    `json:"adapterName"`
	CreatedAt   time.Time `json:"createdAt"`
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
	ID        string    `json:"id"`
	Action    string    `json:"action"`
	ActorID   string    `json:"actorId"`
	TenantID  string    `json:"tenantId,omitempty"`
	CreatedAt time.Time `json:"createdAt"`
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

func NewStore() *Store {
	tenantID := uuid.NewString()
	nodeID := uuid.NewString()
	providerID := uuid.NewString()
	return &Store{
		DefaultTenantID: tenantID,
		users:           map[string]User{},
		sessions:        map[string]UserSession{},
		refreshTokens:   map[string]RefreshToken{},
		tenants: map[string]Tenant{
			tenantID: {ID: tenantID, Name: "Default Tenant", Slug: "default", Status: "active", CreatedAt: time.Now()},
		},
		nodes: map[string]Node{
			nodeID: {ID: nodeID, TenantID: tenantID, Name: "bootstrap-node", Status: "ready", AdapterName: "xray-adapter", CreatedAt: time.Now()},
		},
		providers: []Provider{{ID: providerID, Name: "Generic VPS", Slug: "generic-vps"}},
		regions: []Region{{
			ID:         uuid.NewString(),
			ProviderID: providerID,
			Name:       "Local Dev",
			Code:       "local-dev-1",
		}},
		capabilities: []Capability{
			{Name: "agent.register", Version: "0.1.0", Source: "core"},
			{Name: "adapter.xray", Version: "0.1.0", Source: "xray-adapter"},
			{Name: "wasm.runtime.wasmedge", Version: "0.1.0", Source: "contract"},
			{Name: "ebpf.fallback", Version: "0.1.0", Source: "contract"},
		},
	}
}

func (s *Store) FindOrCreateUser(email string, password string, passwordHash string) (User, bool) {
	s.mu.Lock()
	defer s.mu.Unlock()
	for _, user := range s.users {
		if user.Email == email {
			return user, user.PasswordHash == "" || heauth.VerifyPassword(user.PasswordHash, password)
		}
	}
	user := User{ID: uuid.NewString(), Email: email, PasswordHash: passwordHash}
	s.users[user.ID] = user
	return user, true
}

func (s *Store) User(id string) User {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.users[id]
}

func (s *Store) CreateSession(userID string, tenantID string) UserSession {
	s.mu.Lock()
	defer s.mu.Unlock()
	session := UserSession{ID: uuid.NewString(), UserID: userID}
	s.sessions[session.ID] = session
	return session
}

func (s *Store) SaveRefreshToken(token string, sessionID string, userID string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.refreshTokens[token] = RefreshToken{Token: token, SessionID: sessionID, UserID: userID}
}

func (s *Store) RotateRefreshToken(token string) (RefreshToken, bool) {
	s.mu.Lock()
	defer s.mu.Unlock()
	record, ok := s.refreshTokens[token]
	if ok {
		delete(s.refreshTokens, token)
	}
	return record, ok
}

func (s *Store) ListTenants() []Tenant {
	s.mu.RLock()
	defer s.mu.RUnlock()
	tenants := make([]Tenant, 0, len(s.tenants))
	for _, tenant := range s.tenants {
		tenants = append(tenants, tenant)
	}
	sort.Slice(tenants, func(i int, j int) bool { return tenants[i].CreatedAt.Before(tenants[j].CreatedAt) })
	return tenants
}

func (s *Store) CreateTenant(name string, slug string) Tenant {
	s.mu.Lock()
	defer s.mu.Unlock()
	tenant := Tenant{ID: uuid.NewString(), Name: name, Slug: slug, Status: "active", CreatedAt: time.Now()}
	s.tenants[tenant.ID] = tenant
	return tenant
}

func (s *Store) Tenant(id string) (Tenant, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	tenant, ok := s.tenants[id]
	return tenant, ok
}

func (s *Store) ListNodes() []Node {
	s.mu.RLock()
	defer s.mu.RUnlock()
	nodes := make([]Node, 0, len(s.nodes))
	for _, node := range s.nodes {
		nodes = append(nodes, node)
	}
	sort.Slice(nodes, func(i int, j int) bool { return nodes[i].CreatedAt.Before(nodes[j].CreatedAt) })
	return nodes
}

func (s *Store) Node(id string) (Node, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	node, ok := s.nodes[id]
	return node, ok
}

func (s *Store) RegisterNode() Node {
	s.mu.Lock()
	defer s.mu.Unlock()
	node := Node{
		ID:          uuid.NewString(),
		TenantID:    s.DefaultTenantID,
		Name:        fmt.Sprintf("agent-%d", len(s.nodes)+1),
		Status:      "registered",
		AdapterName: "xray-adapter",
		CreatedAt:   time.Now(),
	}
	s.nodes[node.ID] = node
	return node
}

func (s *Store) CreateBootstrapToken(tenantID string) BootstrapToken {
	return BootstrapToken{Token: uuid.NewString(), ExpiresAt: time.Now().Add(1 * time.Hour)}
}

func (s *Store) Audit(action string, actorID string, tenantID string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.audit = append(s.audit, AuditLog{ID: uuid.NewString(), Action: action, ActorID: actorID, TenantID: tenantID, CreatedAt: time.Now()})
}

func (s *Store) ListAudit() []AuditLog {
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := append([]AuditLog(nil), s.audit...)
	sort.Slice(out, func(i int, j int) bool { return out[i].CreatedAt.After(out[j].CreatedAt) })
	return out
}
