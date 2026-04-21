# 01. Product Overview

## 1.1 Vision

Build HugeEdge as a composable secure edge access platform that combines:

- a low-latency operator-grade control plane
- a Go-based backend and node agent
- strong tenant and plan isolation
- one-click node enrollment and lifecycle management
- identity-aware and posture-aware access decisions
- auditable subscription, policy, and operational workflows
- replaceable integrations and runtime adapters via WebAssembly (WASM) extensions

The product is intended for lawful secure remote access, edge runtime orchestration, and managed service scenarios.

## 1.2 Product Thesis

The original spec assumed a strong built-in control plane and a fixed node runtime.
The refreshed thesis is:

1. Operators want one control plane but not one vendor lock-in point.
2. Identity, posture, JIT, and audit are now core workflow requirements.
3. Edge access products increasingly compete on explainability and integration quality.
4. The winning architecture is a governed platform core with pluggable capabilities.

## 1.3 Personas

### Platform Owner

Needs:

- tenant lifecycle control
- gross margin and node cost visibility
- edition packaging without code forks
- configurable integration strategy by customer tier
- security and compliance controls

### Operations / NOC

Needs:

- live fleet health
- rollout blast-radius controls
- batch drain, maintenance, and replacement
- explainable rollout failures
- policy and config diff visibility

### Support Agent

Needs:

- unified tenant timeline
- quick answers to "why was access denied?"
- safe diagnostics and temporary remediation
- reversible support actions with audit trails

### Tenant Admin

Needs:

- user and group lifecycle management
- SCIM-aware onboarding and offboarding
- policy templates and posture requirements
- quota and billing visibility
- self-service approvals and exports

### Security / Compliance Admin

Needs:

- phishing-resistant admin authentication
- passkey-ready privileged flows
- posture and identity policy controls
- approval chains for elevated actions
- exportable audit evidence

### Infrastructure Engineer

Needs:

- bootstrap nodes quickly
- tag nodes by provider, region, cost class, and role
- support multiple access runtimes through adapters
- keep provider-specific logic isolated

## 1.4 Product Principles

1. Control plane latency and operator ergonomics matter as much as raw feature breadth.
2. Every access, rollout, and quota decision must be explainable after the fact.
3. The core should be stable; integrations should be replaceable.
4. Identity, posture, and approval context should be first-class policy inputs.
5. Tenants must never be co-mingled in billing, policy evaluation, or audit views.
6. Node inventory and runtime capability are first-class product assets.
7. Operational safety beats permissive remote control.
8. Composability must be governed, not ad hoc.

## 1.5 Core Capability Model

HugeEdge should be described in terms of core capabilities and extension capabilities.

### Core platform capabilities

- tenancy and subscription management
- identity and continuous adaptive trust (CARTA) orchestration
- node fleet and runtime lifecycle management
- policy compilation and decision explainability
- usage, quota, billing, and cost visibility
- observability, audit, and incident workflows
- policy-driven remediation engine with optional heuristic-based anomaly detection

### Extension capabilities

- identity provider connectors
- SCIM and directory sync connectors
- billing provider connectors
- device posture providers and EDR/MDM inputs
- node provider adapters
- notification and ticketing sinks
- data export and webhook sinks
- UI extensions and policy packs
- runtime adapters for different edge engines
- WASM edge plugins for custom traffic inspection and transformation

## 1.6 Functional Scope

### In scope

- multi-tenant admin and tenant-facing panel
- node enrollment and lifecycle management
- plan, billing, quota, and usage controls
- policy distribution and rollout orchestration
- observability, audit, and diagnostics
- passkey-ready and phishing-resistant admin auth design
- posture-aware and approval-aware access workflows
- SCIM traceability and policy simulation design
- pluggable connector and runtime adapter model

### Out of scope

- stealth or anti-detection transports
- censorship evasion
- geo-unblocking guarantees
- shipping a full endpoint security suite
- building every possible client application in v1
- replacing every SSE/SASE domain in the first release
- implementation-level sprint plans in this refresh

## 1.7 Key Product Surfaces

### Tenant and subscription management

- tenant creation and suspension
- organization and individual account models
- plans, trials, coupons, credits, and invoicing
- quotas for traffic, seats, devices, sessions, and API tiers

### Identity and trust orchestration

- SSO and SCIM readiness
- passkey-ready privileged access
- continuous device posture and adaptive trust signals (CARTA)
- session kill-switches and dynamic risk scoring
- JIT or time-bound approval workflows
- user, device, and workload identity modeling

### Fleet and runtime operations

- one-click node enrollment
- node capability discovery
- remote commands with governance
- bounded self-healing and autonomous remediation under explicit policies
- rollout channels and rollback
- provider and region-aware orchestration
- WASM plugin lifecycle management on nodes

### Policy and profile delivery

- policy packs and defaults by edition
- profile generation and artifact versioning
- simulated policy evaluation before rollout
- decision explanations and diff views

### Audit and observability

- heartbeat, traffic, session, and health signals
- audit logs for admin, access, and rollout actions
- remediation history and node health scoring
- export sinks for SIEM, storage, and compliance workflows
- support-ready timelines and diagnostics bundles

## 1.8 Updated Success Metrics

### Product metrics

- signup to first enrolled node under 10 minutes
- tenant activation to first usable access profile under 5 minutes
- first third-party connector configured under 15 minutes
- over 95% of support actions completed without direct database intervention
- over 90% of access-deny tickets resolved from product telemetry and audit alone

### Architecture metrics

- new connector type added without core-domain rewrites
- policy simulation available before production rollout
- capability manifest visible for every node and extension
- N-2 support for agent and runtime adapters

### Control plane SLOs

- p95 read API latency under 150 ms
- p95 write API latency under 300 ms
- policy publish completion for 1,000 nodes under 30 seconds
- heartbeat ingestion lag under 10 seconds

### Fleet SLOs

- node heartbeat freshness at or above 99.5%
- upgrade success rate above 98%
- mean time to isolate a bad node under 3 minutes

## 1.9 Product Editions

### Starter

- small team or single-operator deployment
- basic tenant and node management
- basic quotas, usage, and monitoring
- limited connector set

### Growth

- multi-tenant operation
- policy packs
- posture inputs
- canary rollout
- webhook and export support

### Enterprise / MSP

- SSO and SCIM
- advanced approval workflows
- passkey-focused admin security
- audit export and evidence bundles
- dedicated node pools or regions
- custom connector and UI extension support

## 1.10 Positioning Guidance

Externally position HugeEdge as:

- a composable secure edge access platform
- a multi-tenant access and node orchestration control plane
- a platform for identity-aware access, rollout governance, and auditability

Avoid positioning it as:

- a consumer VPN brand
- a stealth networking product
- a one-vendor replacement for every security tool in the stack
