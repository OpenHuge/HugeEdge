# Spec Index

This package contains the design-stage specification for HugeEdge, a composable secure edge access platform built with:

- Monorepo: Turbo + pnpm
- Backend: Go
- Frontend: TanStack Start + Mantine

Use this index when handing the spec to product, architecture, design, security, or engineering stakeholders.

Suggested reading order:

1. Strategy and market input
2. Product overview
3. Architecture
4. Monorepo structure
5. Backend
6. Node agent
7. Frontend
8. Data model
9. API
10. Ops
11. Security
12. Billing
13. SRE
14. Roadmap
15. Implementation readiness

Key shifts in this refresh:

- identity, posture, CARTA continuous adaptive trust, and tiered passkey admin security are core architecture
- the commercial model is hybrid B2B + B2C with individual, organization, and reseller account types
- billing moves from plan placeholders to a formal domain with catalog, subscriptions, orders, payments, invoices, wallets, and subscription feeds
- architecture is explicitly pluggable and composable via WASM edge plugins and eBPF telemetry probes
- integrations, policy packs, and runtime adapters are treated as first-class extension surfaces
- agent binary supply chain secured with TUF (The Update Framework) and Ed25519 signing
- Post-Quantum Cryptography (PQC) readiness and crypto-agility built into the security baseline
- EU AI Act compliance for AI-driven automated remediation decisions
- OpenTelemetry with versioned semantic conventions as the observability standard
- SCIM 2.0 with RFC 9865 cursor-based pagination for enterprise directory sync at scale
- framework versions pinned: Go 1.24+, TanStack Start v1, Mantine v9, React 19.2+
- the package remains design-only and does not commit to implementation sequencing beyond the roadmap
