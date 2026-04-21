ALTER TABLE nodes
  ADD COLUMN agent_version TEXT NOT NULL DEFAULT '0.1.0',
  ADD COLUMN runtime_version TEXT NOT NULL DEFAULT '0.1.0',
  ADD COLUMN health_status TEXT NOT NULL DEFAULT 'offline',
  ADD COLUMN health_score INTEGER NOT NULL DEFAULT 0;

CREATE TABLE config_bundles (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  node_id UUID NOT NULL REFERENCES nodes(id),
  adapter_name TEXT NOT NULL DEFAULT 'xray-adapter',
  bundle_version INTEGER NOT NULL,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  hash TEXT NOT NULL,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (node_id, bundle_version)
);

CREATE TABLE rollouts (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  node_id UUID NOT NULL REFERENCES nodes(id),
  bundle_id UUID NOT NULL REFERENCES config_bundles(id),
  previous_bundle_id UUID REFERENCES config_bundles(id),
  adapter_name TEXT NOT NULL DEFAULT 'xray-adapter',
  status TEXT NOT NULL DEFAULT 'pending',
  note TEXT NOT NULL DEFAULT '',
  created_by UUID REFERENCES users(id),
  rollback_of_rollout_id UUID REFERENCES rollouts(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE TABLE node_config_states (
  node_id UUID PRIMARY KEY REFERENCES nodes(id),
  current_bundle_id UUID REFERENCES config_bundles(id),
  desired_bundle_id UUID REFERENCES config_bundles(id),
  last_apply_status TEXT,
  last_apply_message TEXT,
  last_apply_at TIMESTAMPTZ,
  last_known_good_bundle_id UUID REFERENCES config_bundles(id)
);

CREATE TABLE node_config_applies (
  id UUID PRIMARY KEY,
  node_id UUID NOT NULL REFERENCES nodes(id),
  rollout_id UUID NOT NULL REFERENCES rollouts(id),
  bundle_id UUID NOT NULL REFERENCES config_bundles(id),
  status TEXT NOT NULL,
  message TEXT NOT NULL DEFAULT '',
  health_status TEXT NOT NULL DEFAULT 'offline',
  health_score INTEGER NOT NULL DEFAULT 0,
  agent_version TEXT NOT NULL DEFAULT '0.1.0',
  runtime_version TEXT NOT NULL DEFAULT '0.1.0',
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ
);
