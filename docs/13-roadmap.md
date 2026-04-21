# 13. Roadmap

This roadmap is design guidance only.
It is the recommended delivery order once implementation is approved.

## Phase -1: Product and Architecture Alignment

- finalize capability model
- finalize policy merge order and decision trace format
- define extension manifest contract
- define runtime adapter contract
- define privileged auth and passkey posture
- approve non-goals and market positioning

Exit criteria:

- spec package approved by product, architecture, and security stakeholders

## Phase 0: Platform Foundation

- repo setup with Turbo plus pnpm
- Go API skeleton
- TanStack Start app shell
- auth, RBAC, tenancy foundation
- Postgres, Redis, and messaging stack
- capability registry foundation
- seed data and CI

Exit criteria:

- operator can log in, create tenants, discover capabilities, and manage foundational settings

## Phase 1: Core Control Plane and Node Inventory

- tenants
- plans
- subscriptions
- node CRUD
- bootstrap token issuance
- node inventory
- capability manifest ingestion
- basic dashboard
- audit logs

Exit criteria:

- operator can create tenant, issue bootstrap token, enroll node, view health, and inspect node capabilities

## Phase 2: Runtime Adapters and Remote Ops

- installer
- agent enrollment
- heartbeat
- config fetch and apply
- runtime adapter selection
- remote commands
- local self-healing ladder
- drain and maintenance
- runtime version tracking

Exit criteria:

- one-click install works on supported distros
- rollback on bad config works
- command execution and adapter compatibility are visible in the panel
- bounded local remediation works for approved failure classes
- TUF-verified agent self-update works end to end

## Phase 2.5: Edge Extensibility Foundation

- WASM sandbox runtime integration on node agent
- first WASM plugin build, sign, and deploy pipeline
- eBPF probe profiles for network and system telemetry
- kernel compatibility detection and graceful degradation

Exit criteria:

- a sample WASM plugin can be deployed, verified, and loaded on a target node
- eBPF probes emit OpenTelemetry-compatible telemetry without sidecar overhead

## Phase 3: Identity, Trust, and Governance

- SSO-ready identity boundary
- SCIM lifecycle model (RFC 9865 cursor-based pagination)
- posture inputs and CARTA continuous adaptive trust signals
- access requests and approvals
- policy simulation
- privileged admin MFA and tiered passkey deployment

Exit criteria:

- admins can simulate policy decisions and review approval trails before enforcing high-risk changes

## Phase 4: Profiles, Quotas, Billing, and Exports

- profile generation
- device registration
- traffic rollups
- plan quota enforcement
- billing webhook processing
- invoice views
- export sinks and threshold alerts
- remediation analytics

Exit criteria:

- tenant self-service is viable
- quota logic is enforced and auditable
- usage and audit data can be exported cleanly

## Phase 5: Integrations and Ecosystem

- billing connectors
- posture provider connectors
- notification sinks
- export sinks
- node provider adapters
- UI extension model

Exit criteria:

- at least one connector in each primary capability family can be enabled without core rewrites

## Phase 6: Advanced Operations and Enterprise Features

- advanced RBAC
- dedicated pools or regions
- audit evidence bundles
- reserved capacity
- custom policy packs
- custom branding where needed
- advanced autonomous remediation policies
- provider-assisted node replacement workflows

Exit criteria:

- enterprise or MSP operation is supportable without branching the core product

## Suggested Team Shape

### Minimum viable team

- 1 staff or principal full-stack lead
- 2 backend Go engineers
- 1 frontend engineer
- 1 infra or SRE engineer
- shared product and design support

### Better execution team

- plus 1 product designer
- plus 1 QA or automation engineer
- plus 1 integrations or billing engineer

## Technical Debt to Watch

- modular monolith boundaries eroding
- too much business logic in handlers
- capability registry becoming a loose metadata dump
- rollout simulation lagging behind real policy behavior
- weak agent backward compatibility
- dashboard queries hitting raw event tables directly

## Future Enhancements

- ARM image bake pipeline
- provider API integrations for automatic provisioning
- reserved node pools
- multi-region control plane
- customer-facing status page per tenant
- richer policy simulation UI
- cost optimizer for node placement
- workload and machine identity expansion
- predictive capacity and failure scoring
- Agentless access bridging (browser isolation) for BYOD and contractors
- PQC migration: hybrid PQC-TLS for agent and control plane channels
- SASE/SSE convergence: SWG and CASB integration surfaces
- advanced WASM plugin marketplace and third-party ecosystem
