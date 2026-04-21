# 11. Billing and Quotas

## 11.1 Billing Model

HugeEdge uses a hybrid B2B + B2C commercial model built on three layers:

- `accounts` are the commercial principals and may be `individual`, `organization`, or `reseller`
- `tenants` remain the control-plane and resource-isolation boundary
- `memberships` remain tenant RBAC, while `account_memberships` govern billing and account administration

Fixed account roles:

- `account_owner`
- `billing_admin`
- `account_admin`
- `member`

Fixed reseller roles:

- `reseller_owner`
- `reseller_operator`
- `reseller_finance`

Fixed platform roles:

- `platform_admin`
- `finance_admin`
- `catalog_admin`
- `support_admin`

Behavior rules:

- creating an `individual` account auto-creates a personal tenant
- an organization account supports member invites, seat management, and billing administration
- a reseller account can create and manage customer accounts, hold prepaid balance, issue recharge codes, and receive settlement statements
- revoking a session does not release a billable seat
- removing a user from a billable seat releases the seat
- inactivity-based seat expiration is supported as a reclaim path

## 11.2 Plan Dimensions

Commercial packaging is modeled through:

- `catalog_products` for market-facing offers such as `Personal`, `Team`, `Business`, and `Enterprise`
- `catalog_skus` for sellable units
- `price_versions` for channel, currency, tax, visibility, and reseller pricing
- `entitlement_templates` for default capability and quota bundles

Supported SKU types:

- `base_subscription`
- `traffic_pack`
- `seat_pack`
- `device_pack`
- `region_pack`
- `connector_pack`
- `wallet_topup`
- `recharge_code_batch`
- `support_addon`

Billing intervals:

- recurring: `monthly`, `quarterly`, `annual`
- one-time: traffic packs, seat packs, device packs, wallet top-ups, and recharge-code batches

Rules:

- only one base subscription may be effective at a time
- add-ons may stack
- traffic resets by billing period and does not carry over by default
- carryover is allowed only when explicitly enabled on the effective `price_version`

## 11.3 Subscription States

- trialing
- active
- grace
- past_due
- suspended
- canceled
- expired

State transitions must be explicit and auditable.

## 11.4 Entitlements

Supported first-class entitlement keys:

- `seats`
- `traffic_bytes_included`
- `traffic_bytes_hard_cap`
- `max_devices`
- `max_concurrent_sessions`
- `allowed_regions`
- `subscription_feed_count`
- `api_tier`
- `connector_limits`
- `reserved_capacity`
- `support_tier`
- `ephemeral_runtime_minutes`

These are backend-evaluated entitlements, not UI hints.

## 11.5 Orders, Payments, Invoices, and Wallets

Core lifecycle objects:

- `subscriptions`
- `subscription_items`
- `orders`
- `order_items`
- `payment_intents`
- `payment_attempts`
- `payment_methods`
- `invoices`
- `invoice_items`
- `wallets`
- `credit_ledger`
- `coupons`
- `recharge_codes`

Order states:

- `draft`
- `pending_payment`
- `paid`
- `activating`
- `active`
- `canceled`
- `expired`
- `refunded`

Payment states:

- `requires_action`
- `pending`
- `confirmed`
- `settled`
- `failed`
- `refunded`
- `chargeback`

Invoice states:

- `draft`
- `issued`
- `paid`
- `void`
- `refunded`
- `overdue`

Supported payment channels:

- `stripe_card`
- `paypal`
- `crypto`
- `bank_transfer`
- `wallet_balance`
- `recharge_code`

Settlement rules:

- client totals are never trusted; the backend produces the final payable amount
- discount application order is fixed: `coupon -> credit -> wallet -> external payment`
- manual, crypto, and bank-transfer flows remain pending until webhook or operator confirmation activates the order

## 11.6 Quota Enforcement

### Traffic
- ingest raw counters from nodes
- aggregate hourly
- summarize daily and by billing period
- compare against included and hard limits
- enforce soft-limit warnings and hard-cap behavior from the effective subscription

### Devices
- enforced synchronously on registration
- revocation frees capacity
- device binding may optionally apply to subscription-feed tokens

### Concurrent sessions
- enforced by control plane issued tokens and runtime callback summaries
- allow short grace overlap for reconnects

### Seats
- seat assignment is distinct from login session state
- removing a member from a billable seat frees the seat
- inactivity-based seat expiration can reclaim seats without deleting membership history

### Feed count and entitlement add-ons
- limit number of active subscription feeds per effective entitlement
- sum add-on items into the evaluated entitlement snapshot
- support `base subscription + traffic pack + seat pack` as a standard combination

## 11.7 Overage Policies

Configurable by plan:
- block at hard cap
- allow until invoice threshold
- throttle features or reduced service tier
- admin manual override for grace

## 11.8 Reseller Model

Reseller is a strict two-level structure:

- `platform -> reseller -> customer`
- reseller cannot create nested reseller trees

Reseller capabilities:

- prepaid balance
- customer creation and transfer
- batch activation
- batch renewal
- recharge-code generation
- monthly settlement statements

Not supported:

- MLM or infinite-depth commission models

## 11.9 Billing Provider Integration

Use Stripe or equivalent in v1:
- checkout
- customer portal
- webhooks for invoice/payment/subscription events
- tax where supported

Keep billing provider behind abstraction:
- `BillingGateway` interface
- webhook normalization layer
- internal subscription state remains source of truth after reconciliation

## 11.10 Subscription Feed Delivery

HugeEdge adopts an airport-style subscription link as a formal delivery artifact, but only for HugeEdge access profiles and config feeds.

Core objects:

- `subscription_feeds`
- `subscription_feed_tokens`
- `profile_artifacts`
- `client_compat_manifests`

Rules:

- each active subscription gets one default primary feed
- higher tiers may allow multiple feeds
- feeds support token rotate, revoke, optional device bind, expiry metadata, usage metadata, ETag, Last-Modified, and `HEAD`
- the returned payload may contain HugeEdge profile bundles plus client-facing metadata, quota status, expiry, notices, and upgrade prompts
- client compatibility wrappers may exist, but the platform does not hard-code itself to one proxy protocol as the product definition

Delivery headers:

- `X-HE-Plan`
- `X-HE-Usage`
- `X-HE-Total`
- `X-HE-Expire-At`
- `X-HE-Status`
- `X-HE-Notice`
- `X-HE-ETag`

## 11.11 Revenue and Margin Views

Admin dashboards:
- MRR / ARR approximation
- active subscriptions
- churn
- trial conversion
- reseller prepaid liabilities and settlement aging
- region cost by provider
- node utilization vs cost
- gross margin estimate per plan or region

## 11.12 Finance-Safe Principles

- never trust client-side price calculations
- immutable invoice snapshots
- idempotent webhook processing
- reconcile provider events daily
- separate credits from payments
- audit every price change, order mutation, payment confirmation, refund, feed rotation, and reseller wallet adjustment

## 11.13 Packaging for Advanced Features

Advanced commercial dimensions may include:

- number of enabled connector instances
- posture provider integrations
- export destinations
- advanced audit retention
- reserved node pools
- self-healing and remediation analytics
- premium support and approval workflows

The product should support packaging these without coupling entitlement checks to UI-only logic.

## 11.14 Operator and Self-Service Surfaces

Operator routes:

- `/admin/billing/overview`
- `/admin/billing/products`
- `/admin/billing/subscriptions`
- `/admin/billing/orders`
- `/admin/billing/resellers`
- `/admin/billing/invoices`

Self-service routes:

- `/app/store`
- `/app/subscription`
- `/app/orders`
- `/app/invoices`
- `/app/wallet`
- `/app/members`
- `/app/feeds`

## 11.15 Test Matrix

Billing and commercial acceptance must cover:

- individual signup -> trial -> order -> payment -> active subscription -> readable feed
- organization invite -> seat occupied -> seat removed -> seat released -> relogin re-consumes seat
- billing overview shows current subscription, expiry, historical orders, invoices, and auto-renew toggle
- add-on stacking for `base plan + traffic pack + seat pack`
- mixed settlement using coupon, wallet, and external payment
- manual, crypto, and bank-transfer orders staying pending until confirmation
- reseller prepaid balance, customer creation, batch activation, recharge-code issue and redeem, and monthly settlement
- subscription-feed `GET`, `HEAD`, rotate invalidation, revoke invalidation, and metadata headers
- quota enforcement for traffic soft and hard limits, seats, devices, and inactive seat expiration
- audit coverage for membership changes, price changes, ordering, payment, refund, feed rotate or revoke, and reseller adjustments
