# 14. Implementation Readiness

This document is the handoff bridge between architecture design and implementation planning.
It remains spec-level and does not prescribe sprint tasks or code changes.

## 14.1 Purpose

Use this document to confirm that HugeEdge is ready to enter execution with:

- stable architectural contracts
- clear workstream boundaries
- explicit non-functional targets
- known decision owners
- limited unresolved design ambiguity

## 14.2 Locked Design Decisions

The following decisions should be treated as locked unless a formal architecture review reopens them:

- modular monolith first
- capability registry as a first-class subsystem
- extension runtime separated from core domain logic
- runtime adapters as the node-side abstraction
- policy simulation and decision explainability in v1 architecture
- bounded self-healing with policy-driven remediation
- passkey-ready privileged authentication design

## 14.3 Required Workstreams

Implementation should be decomposed into these workstreams:

1. Identity and tenancy
2. Policy and simulation
3. Fleet, agent, and runtime adapters
4. Remediation and self-healing
5. Billing and quotas
6. Integrations and extension runtime
7. Frontend shell and operator surfaces
8. Observability, audit, and exports

Each workstream should own:

- contracts
- persistence changes
- external APIs
- operator-facing UX
- tests and release gates

## 14.4 Minimum Contracts Required Before Coding

The following artifacts should exist before major implementation starts:

- capability manifest schema
- wasm plugin manifest schema
- eBPF probe profile schema
- remediation policy schema
- node health score model
- policy simulation request and response schema
- extension registration schema
- audit event taxonomy
- runtime adapter interface
- failure-class taxonomy

## 14.5 Open Decisions That Must Be Resolved Early

These are still strategic choices, not implementation details:

- policy expression engine selection
- whether extension runtime is process-isolated only or network-isolated too
- initial runtime adapter set
- initial wasm sandbox/runtime selection
- initial eBPF footprint and kernel support matrix
- initial provider adapter set
- initial posture-provider set
- default approval model for high-risk remediation
- whether replacement workflows are provider-integrated in the first implementation wave

## 14.6 Engineering Acceptance Gates

Architecture should not be considered implementation-ready unless all gates are green:

### Contract gate

- schemas versioned
- examples included
- compatibility rules written

### Operational gate

- dashboards defined
- alerts defined
- remediation policies defined
- rollback paths defined

### Security gate

- privileged auth posture agreed
- extension trust classes defined
- autonomous remediation guardrails approved

### Product gate

- edition and entitlement boundaries agreed
- support and operator flows reviewed
- deny and remediation explanations reviewed

## 14.7 Definition of Ready for First Build

The spec package is ready for implementation kickoff when:

1. all locked decisions are accepted
2. open decisions have owners and deadlines
3. API and data contracts exist for the first delivery slice
4. observability and remediation policies are defined alongside feature scope
5. architectural exceptions are documented instead of left implicit

## 14.8 Risks to Watch During Implementation

- remediation logic becoming scattered across worker jobs and agent code
- extension loading becoming a loophole around core governance
- UI assumptions getting ahead of capability discovery contracts
- node health scoring becoming too subjective to automate safely
- rollout and self-healing loops conflicting with each other

## 14.9 Recommended First Delivery Slice

The first implementation slice should prove:

- tenant and auth foundations
- node enrollment
- capability manifest ingestion
- config apply and rollback
- basic remediation policy with a narrow failure set
- remediation visibility in UI
- audit and telemetry for all automated actions

## 14.10 Sources Informing This Readiness Pass

- [Twingate Connector Best Practices](https://www.twingate.com/docs/connector-best-practices)
- [Twingate Advanced Connector Management](https://www.twingate.com/docs/advanced-connector-management)
- [Teleport Access Monitoring Rules](https://goteleport.com/docs/reference/access-controls/access-monitoring-rules/)
- [Cloudflare Access Changelog](https://developers.cloudflare.com/cloudflare-one/changelog/access/)
- [Cloudflare User Risk Score Selector](https://developers.cloudflare.com/changelog/post/2026-03-04-user-risk-score-access-policies/)
- [Tailscale Auto-Updates](https://tailscale.com/docs/features/client/update)

## 14.11 Implementation Recommendation

Recommendation: proceed to implementation now, with a constrained first slice.

Required pre-start locks:

1. lock the first runtime adapter and wasm sandbox target
2. lock deterministic remediation policy contract before optional detector enhancements
3. lock CARTA response contract (`allow`, `step_up`, `restrict`, `terminate`)
4. lock plugin signing and rollout verification process

Once these four are approved, implementation should start immediately.
