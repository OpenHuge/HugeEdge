# 11. Billing and Quotas

## 11.1 Billing Model

Support:
- monthly / annual subscriptions
- trials
- coupons
- credits
- seat-based pricing
- traffic-included plans
- overage pricing optional in later phases

## 11.2 Plan Dimensions

Each plan may define:
- monthly included traffic
- hard cap traffic
- max devices
- max concurrent sessions
- support tier
- allowed regions
- reserved capacity entitlement
- API access availability
- custom branding availability

## 11.3 Subscription States

- trialing
- active
- past_due
- suspended
- canceled
- expired

State transitions must be explicit and auditable.

## 11.4 Quota Enforcement

### Traffic
- ingest raw counters from nodes
- aggregate hourly
- summarize daily and by billing period
- compare against included and hard limits

### Devices
- enforced synchronously on registration
- revocation frees capacity

### Concurrent sessions
- enforced by control plane issued tokens and runtime callback summaries
- allow short grace overlap for reconnects

## 11.5 Overage Policies

Configurable by plan:
- block at hard cap
- allow until invoice threshold
- throttle features or reduced service tier
- admin manual override for grace

## 11.6 Billing Provider Integration

Use Stripe or equivalent in v1:
- checkout
- customer portal
- webhooks for invoice/payment/subscription events
- tax where supported

Keep billing provider behind abstraction:
- `BillingGateway` interface
- webhook normalization layer
- internal subscription state remains source of truth after reconciliation

## 11.7 Revenue and Margin Views

Admin dashboards:
- MRR / ARR approximation
- active subscriptions
- churn
- trial conversion
- region cost by provider
- node utilization vs cost
- gross margin estimate per plan or region

## 11.8 Finance-Safe Principles

- never trust client-side price calculations
- immutable invoice snapshots
- idempotent webhook processing
- reconcile provider events daily
- separate credits from payments

## 11.9 Packaging for Advanced Features

Advanced commercial dimensions may include:

- number of enabled connector instances
- posture provider integrations
- export destinations
- advanced audit retention
- reserved node pools
- self-healing and remediation analytics
- premium support and approval workflows

The product should support packaging these without coupling entitlement checks to UI-only logic.
