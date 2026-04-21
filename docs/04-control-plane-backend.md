# 04. Control Plane Backend

## 4.1 Backend Goals

- fast CRUD for tenants, users, nodes, plans, and subscriptions
- resilient async workflows for rollouts, approvals, and remote ops
- durable audit logs and decision traces
- predictable quota enforcement
- composable integration and runtime management
- simple deployability with clear internal boundaries

## 4.2 Go Stack Recommendations

### HTTP

- `chi` preferred for lightweight composability
- OpenAPI middleware for request validation where helpful

### Database

- `pgx` plus `sqlc` for predictable performance and type safety
- migrations with `golang-migrate` or `atlas`

### Auth

- short-lived JWT access token plus rotating refresh token
- API tokens for programmatic access
- WebAuthn or passkey-ready admin flows in the identity boundary
- signed one-time bootstrap tokens for agents

### Policy evaluation

- design policy as declarative data
- use a constrained expression engine such as CEL, or a similarly embeddable model, for explainable rule evaluation
- keep merge order and enforcement semantics owned by the product core

### Async and messaging

- NATS JetStream
- worker consumers with explicit ack, retry, and DLQ semantics
- durable pull consumers for flow control under high-throughput telemetry ingestion

### Background jobs

Use internal workers for:

- billing reconciliation
- report generation
- usage rollups
- rollout fan-out
- alert evaluation
- stale session cleanup
- SCIM sync reconciliation (RFC 9865 cursor-based pagination for large directories)
- export delivery
- remediation evaluations

## 4.3 Domain Modules

### Identity

- users
- admin accounts
- organization memberships
- MFA and passkey-ready credentials
- sessions
- API tokens

### Tenancy

- tenants
- teams
- roles
- seats
- feature flags
- ownership transfer

### Billing

- plans
- subscriptions
- invoices
- payment events
- credits
- proration

### Fleet

- providers
- regions
- node groups
- nodes
- runtime versions
- maintenance windows

### Policy

- route and access profiles
- access policy sets
- posture requirements
- approval rules
- compiled effective policy

### Profile

- profile artifacts
- device registration
- credential rotation
- signed downloads
- QR and provisioning payload support

### Telemetry

- node heartbeats
- traffic counters
- latency samples
- session summaries
- anomaly markers

### Extensions

- manifests
- registrations
- connector instances
- compatibility checks
- capability health

### Audit

- immutable audit log
- actor, target, and diff
- decision traces
- source IP and user agent
- correlation ID

## 4.4 Request Lifecycle Patterns

### Write path

1. authenticate actor
2. resolve tenant and capability scope
3. authorize action
4. validate DTO and capability compatibility
5. execute domain service
6. write transaction
7. insert outbox events for side effects
8. return response
9. workers process effects and emit audit detail

### Read path

1. authenticate
2. resolve tenant and actor visibility
3. authorize
4. read from optimized query, cache, or read model
5. enrich with capability metadata if needed
6. shape response

### Decision path

1. collect subject, device, node, and policy inputs
2. resolve effective policy and entitlements
3. evaluate rules, risk inputs, and approvals
4. produce CARTA-graduated response: `allow`, `step_up` (require MFA), `restrict` (reduce scope), or `terminate` (kill session)
5. persist trace for later explanation where appropriate

## 4.5 Quota Engine

Quota dimensions:

- included traffic bytes per billing period
- hard-cap traffic bytes
- concurrent sessions
- active devices
- seats
- nodes per tenant
- API rate limit tier
- extension usage limits where commercialized

Evaluation strategy:

- synchronous check for device, seat, and session counts
- near-real-time usage aggregation for traffic
- threshold alerts at 70, 85, and 95 percent
- hard-stop behavior configurable by plan
- decision traces for quota denials

## 4.6 Policy Compiler

Inputs:

- tenant plan
- assigned policy packs
- user, device, and workload overrides
- posture inputs
- region and node availability
- runtime compatibility
- approval configuration

Outputs:

- resolved profile
- node-targeted bundle
- decision-ready policy snapshot
- versioned artifact metadata

Compiler requirements:

- deterministic output
- diff-friendly structure
- pure-function style where possible
- cached by hash of normalized input
- explainable merge order

## 4.7 Capability Registry

The registry should store:

- capability family and name
- owner and trust class
- version and compatibility matrix
- config schema reference
- secret requirements
- health and status
- tenant visibility
- edition gating

The registry becomes the source for:

- admin UX discovery
- extension lifecycle operations
- rollout pre-checks
- node/runtime compatibility checks

## 4.8 Command and Rollout Engine

Supported operation families:

- enroll node
- rotate node cert
- fetch inventory
- apply config
- reload runtime
- restart agent
- restart runtime
- cordon or uncordon
- drain
- maintenance start and finish
- collect diagnostics
- upgrade agent
- upgrade runtime

Safety controls:

- operation allowlist
- per-command timeout
- concurrency cap
- dry-run where applicable
- region-scoped batching
- rollback support
- approval rules for elevated actions

## 4.9 Integration and Extension Model

Extension lifecycle:

1. register manifest
2. validate schema and compatibility
3. configure secrets and tenant scope
4. run health checks
5. enable capability
6. observe and audit usage
7. rotate, disable, or uninstall safely

Runtime rules:

- connectors do not access tables directly
- extension calls go through application services or integration APIs
- secret access is least-privilege and scoped
- every extension action emits audit events

## 4.10 API Design Rules

- REST for control plane
- resource-oriented URLs
- explicit capability discovery endpoints
- idempotency keys for sensitive POSTs
- cursor pagination
- RFC3339 timestamps in UTC
- stable machine-readable reason codes
- no overloaded `status` fields without lifecycle docs

## 4.11 Performance Requirements

- use prepared SQL
- avoid ORM-heavy abstraction
- batch insert heartbeats and metrics
- use partial indexes for active entities
- partition large event tables by time
- stream exports rather than materializing large payloads
- cache capability manifests and entitlement lookups aggressively

## 4.12 Reliability Patterns

- outbox pattern for side effects
- retries with jitter
- DLQ for poison jobs
- leader election for singleton schedulers
- graceful shutdown with drain time
- migration compatibility checks in CI
- extension health circuit breakers where external providers are unstable

## 4.13 Security Controls

- all admin actions audited
- secrets encrypted at rest
- per-tenant API token scoping
- passkey-ready and phishing-resistant admin auth for privileged paths
- agent bootstrap tokens are one-time and short TTL
- mTLS between agent and control plane
- signed config bundles with expiration
- extensions cannot bypass audit, approvals, or tenant scoping

## 4.14 Self-Healing and Remediation Engine

The backend should include a remediation engine responsible for policy-driven automated recovery.

Core responsibilities:

- compute node health score
- classify failure mode
- select remediation policy
- enforce retry budgets and cooldowns
- dispatch safe actions
- evaluate success or fallback state
- emit audit, incident, and analytics events

Required concepts:

- remediation policy
- remediation plan
- remediation attempt
- retry budget
- cooldown window
- escalation target

Minimum failure classes:

- `agent_unreachable`
- `runtime_unhealthy`
- `config_apply_failed`
- `cert_rotation_failed`
- `disk_pressure`
- `network_path_degraded`
- `capacity_exhausted`

Minimum action classes:

- `restart_agent`
- `restart_runtime`
- `rollback_config`
- `rotate_material`
- `drain_node`
- `quarantine_node`
- `replace_node`
- `require_human_review`

The remediation engine should remain deterministic and policy-driven.
It should not behave like an opaque autopilot.

## 4.15 Risk and Automation Governance

If heuristic-assisted detection is enabled, backend contracts should include:

- detector version and policy version references on decisions
- confidence score and threshold used
- deterministic fallback path when detector output is unavailable or low-confidence
- quality telemetry for ongoing validation
- per-tenant opt-in or opt-out control where commercial policy requires
