# HugeEdge Spec

> Scope note
> This specification describes a compliant secure remote access and edge orchestration platform.
> It does not include censorship-evasion, stealth transport design, fingerprint spoofing, or anti-detection features.

## Current intent

HugeEdge is no longer framed as a single fixed-product stack.
This spec now treats it as a composable platform with:

- a multi-tenant control plane
- hybrid B2B + B2C commercial primitives for individuals, organizations, and resellers
- pluggable identity, billing, posture, notification, and provider integrations
- a node agent that can host multiple runtime adapters
- policy, audit, and rollout workflows designed for explainability and governance

## Stack constraints

- Monorepo: Turbo + pnpm
- Backend: Go 1.24+
- Frontend: TanStack Start v1 + Mantine v9 (React 19.2+)
- Edge extensibility: WASM (WasmEdge / Wasmtime sandbox) + eBPF telemetry probes
- Core priorities: performance, tenant isolation, automation, auditability, composability, crypto-agility

## Reading order

1. [00-strategy-and-market-input.md](./00-strategy-and-market-input.md)
2. [01-product-overview.md](./01-product-overview.md)
3. [02-architecture.md](./02-architecture.md)
4. [03-monorepo-structure.md](./03-monorepo-structure.md)
5. [04-control-plane-backend.md](./04-control-plane-backend.md)
6. [05-node-agent-and-vps-manager.md](./05-node-agent-and-vps-manager.md)
7. [06-frontend-panel.md](./06-frontend-panel.md)
8. [07-data-model.md](./07-data-model.md)
9. [08-api-spec.md](./08-api-spec.md)
10. [09-installation-and-operations.md](./09-installation-and-operations.md)
11. [10-security-compliance.md](./10-security-compliance.md)
12. [11-billing-quotas.md](./11-billing-quotas.md)
13. [12-observability-sre.md](./12-observability-sre.md)
14. [13-roadmap.md](./13-roadmap.md)
15. [14-implementation-readiness.md](./14-implementation-readiness.md)

## Product summary

The platform has three logical layers:

- Control plane: accounts, tenancy, policy, billing, rollout orchestration, audit, observability, integration management
- Capability layer: identity connectors, posture providers, policy packs, notifications, exports, UI extensions, runtime adapters
- Execution plane: node agents, managed runtimes, telemetry probes, local enforcement, diagnostics, lifecycle control

## Design posture

- Control the core, compose the edges (WASM plugins, runtime adapters, eBPF probes)
- Model policy as data, not scattered conditionals
- Enforce Continuous Adaptive Trust (CARTA) with graduated session responses
- Prefer explainable and auditable workflows over opaque automation (EU AI Act ready)
- Secure the supply chain with TUF-signed binaries and crypto-agility for PQC readiness
- Keep implementation optional until the design package is approved

## Non-goals

- No stealth or obfuscation protocols
- No anti-abuse bypass or circumvention tactics
- No censorship-evasion positioning, even when using self-service subscription delivery
- No attempt to replace every SSE/SASE category in v1
- No implementation work implied by this document refresh
