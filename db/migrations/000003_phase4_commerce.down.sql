DROP TABLE IF EXISTS subscription_feed_tokens;
DROP TABLE IF EXISTS subscription_feeds;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS subscriptions;
DROP TABLE IF EXISTS price_versions;
DROP TABLE IF EXISTS catalog_skus;
DROP TABLE IF EXISTS catalog_products;
DROP TABLE IF EXISTS wallets;
DROP TABLE IF EXISTS account_memberships;

ALTER TABLE tenants
  DROP COLUMN IF EXISTS account_id;

DROP TABLE IF EXISTS accounts;
