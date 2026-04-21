CREATE TABLE users (
  id UUID PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE user_sessions (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ
);

CREATE TABLE refresh_tokens (
  id UUID PRIMARY KEY,
  user_session_id UUID NOT NULL REFERENCES user_sessions(id),
  token_hash TEXT NOT NULL UNIQUE,
  rotated_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE tenants (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE roles (
  id UUID PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id),
  name TEXT NOT NULL,
  permissions JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE memberships (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  user_id UUID NOT NULL REFERENCES users(id),
  role_id UUID NOT NULL REFERENCES roles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, user_id, role_id)
);

CREATE TABLE providers (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE
);

CREATE TABLE regions (
  id UUID PRIMARY KEY,
  provider_id UUID NOT NULL REFERENCES providers(id),
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  UNIQUE (provider_id, code)
);

CREATE TABLE nodes (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  name TEXT NOT NULL,
  status TEXT NOT NULL,
  adapter_name TEXT NOT NULL DEFAULT 'xray-adapter',
  last_heartbeat_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE node_capabilities (
  id UUID PRIMARY KEY,
  node_id UUID NOT NULL REFERENCES nodes(id),
  name TEXT NOT NULL,
  version TEXT NOT NULL,
  manifest JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY,
  actor_id UUID,
  tenant_id UUID,
  action TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE outbox_events (
  id UUID PRIMARY KEY,
  aggregate_type TEXT NOT NULL,
  aggregate_id UUID NOT NULL,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  published_at TIMESTAMPTZ
);

CREATE TABLE bootstrap_tokens (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE wasm_plugins (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  version TEXT NOT NULL,
  runtime TEXT NOT NULL DEFAULT 'WasmEdge',
  manifest JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE node_wasm_plugin_installs (
  id UUID PRIMARY KEY,
  node_id UUID NOT NULL REFERENCES nodes(id),
  wasm_plugin_id UUID NOT NULL REFERENCES wasm_plugins(id),
  desired_state TEXT NOT NULL DEFAULT 'disabled',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE ebpf_probe_profiles (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  minimum_kernel TEXT NOT NULL DEFAULT '5.15',
  fallback_mode TEXT NOT NULL DEFAULT 'userspace',
  profile JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE risk_policies (
  id UUID PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id),
  name TEXT NOT NULL,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE remediation_policies (
  id UUID PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id),
  name TEXT NOT NULL,
  mode TEXT NOT NULL DEFAULT 'disabled',
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE remediation_attempts (
  id UUID PRIMARY KEY,
  remediation_policy_id UUID REFERENCES remediation_policies(id),
  status TEXT NOT NULL,
  result JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE passkey_credentials (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  credential_id TEXT NOT NULL UNIQUE,
  public_key BYTEA NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO providers (id, name, slug)
VALUES ('00000000-0000-0000-0000-000000000001', 'Generic VPS', 'generic-vps');

INSERT INTO regions (id, provider_id, name, code)
VALUES ('00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000001', 'Local Dev', 'local-dev-1');
