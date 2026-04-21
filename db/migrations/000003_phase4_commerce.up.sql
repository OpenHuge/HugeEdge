CREATE TABLE accounts (
  id UUID PRIMARY KEY,
  type TEXT NOT NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'active',
  billing_email TEXT NOT NULL DEFAULT '',
  default_tenant_id UUID REFERENCES tenants(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE tenants
  ADD COLUMN account_id UUID REFERENCES accounts(id);

CREATE TABLE account_memberships (
  id UUID PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES accounts(id),
  user_id UUID NOT NULL REFERENCES users(id),
  role_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (account_id, user_id, role_name)
);

CREATE TABLE wallets (
  id UUID PRIMARY KEY,
  account_id UUID NOT NULL UNIQUE REFERENCES accounts(id),
  currency TEXT NOT NULL DEFAULT 'USD',
  balance_minor BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE catalog_products (
  id UUID PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  is_featured BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE catalog_skus (
  id UUID PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES catalog_products(id),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  kind TEXT NOT NULL,
  billing_interval TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE price_versions (
  id UUID PRIMARY KEY,
  sku_id UUID NOT NULL REFERENCES catalog_skus(id),
  currency TEXT NOT NULL,
  unit_amount_minor BIGINT NOT NULL,
  entitlement_template JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_current BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE subscriptions (
  id UUID PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES accounts(id),
  tenant_id UUID REFERENCES tenants(id),
  sku_id UUID NOT NULL REFERENCES catalog_skus(id),
  price_version_id UUID NOT NULL REFERENCES price_versions(id),
  status TEXT NOT NULL,
  current_period_start TIMESTAMPTZ NOT NULL,
  current_period_end TIMESTAMPTZ NOT NULL,
  auto_renew BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE orders (
  id UUID PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES accounts(id),
  subscription_id UUID REFERENCES subscriptions(id),
  status TEXT NOT NULL,
  currency TEXT NOT NULL,
  subtotal_minor BIGINT NOT NULL DEFAULT 0,
  payable_minor BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE subscription_feeds (
  id UUID PRIMARY KEY,
  subscription_id UUID NOT NULL REFERENCES subscriptions(id),
  account_id UUID NOT NULL REFERENCES accounts(id),
  tenant_id UUID REFERENCES tenants(id),
  label TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  primary_feed BOOLEAN NOT NULL DEFAULT false,
  etag TEXT NOT NULL,
  notice TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE subscription_feed_tokens (
  id UUID PRIMARY KEY,
  feed_id UUID NOT NULL REFERENCES subscription_feeds(id),
  token_value TEXT NOT NULL UNIQUE,
  token_hash TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'active',
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_tenants_account_id ON tenants(account_id);
CREATE INDEX idx_account_memberships_user_id ON account_memberships(user_id);
CREATE INDEX idx_subscriptions_account_id ON subscriptions(account_id, created_at DESC);
CREATE INDEX idx_orders_account_id ON orders(account_id, created_at DESC);
CREATE INDEX idx_subscription_feeds_account_id ON subscription_feeds(account_id, created_at DESC);
CREATE INDEX idx_subscription_feed_tokens_feed_id ON subscription_feed_tokens(feed_id, created_at DESC);

INSERT INTO catalog_products (id, code, name, description, is_featured)
VALUES
  (
    '10000000-0000-0000-0000-000000000001',
    'personal',
    'Personal',
    'Self-service access for individual users with a single primary subscription feed.',
    true
  ),
  (
    '10000000-0000-0000-0000-000000000002',
    'team',
    'Team',
    'Seat-based access for small organizations with shared billing and member management.',
    true
  ),
  (
    '10000000-0000-0000-0000-000000000003',
    'traffic-pack',
    'Traffic Pack',
    'One-time traffic add-on for accounts that need more included transfer in the current billing period.',
    false
  );

INSERT INTO catalog_skus (id, product_id, code, name, kind, billing_interval, is_active)
VALUES
  (
    '11000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001',
    'personal-monthly',
    'Personal Monthly',
    'base_subscription',
    'monthly',
    true
  ),
  (
    '11000000-0000-0000-0000-000000000002',
    '10000000-0000-0000-0000-000000000002',
    'team-monthly',
    'Team Monthly',
    'base_subscription',
    'monthly',
    true
  ),
  (
    '11000000-0000-0000-0000-000000000003',
    '10000000-0000-0000-0000-000000000003',
    'traffic-pack-100g',
    'Traffic Pack 100 GB',
    'traffic_pack',
    NULL,
    true
  );

INSERT INTO price_versions (id, sku_id, currency, unit_amount_minor, entitlement_template, is_current)
VALUES
  (
    '12000000-0000-0000-0000-000000000001',
    '11000000-0000-0000-0000-000000000001',
    'USD',
    900,
    '{
      "seats": 1,
      "traffic_bytes_included": 107374182400,
      "traffic_bytes_hard_cap": 107374182400,
      "max_devices": 3,
      "max_concurrent_sessions": 2,
      "subscription_feed_count": 1,
      "api_tier": "starter"
    }'::jsonb,
    true
  ),
  (
    '12000000-0000-0000-0000-000000000002',
    '11000000-0000-0000-0000-000000000002',
    'USD',
    2900,
    '{
      "seats": 5,
      "traffic_bytes_included": 536870912000,
      "traffic_bytes_hard_cap": 536870912000,
      "max_devices": 25,
      "max_concurrent_sessions": 10,
      "subscription_feed_count": 3,
      "api_tier": "growth"
    }'::jsonb,
    true
  ),
  (
    '12000000-0000-0000-0000-000000000003',
    '11000000-0000-0000-0000-000000000003',
    'USD',
    500,
    '{
      "traffic_bytes_included": 107374182400
    }'::jsonb,
    true
  );
