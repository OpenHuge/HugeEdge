# HugeEdge

HugeEdge is a Phase 0 + Phase 1 monorepo for a composable secure edge access control plane.

The current codebase initializes:

- a modular Go control-plane API
- thin `worker`, `ext-runtime`, and `agent` binaries
- a TanStack/Mantine operator shell
- checked-in OpenAPI, database migrations, and contract schemas
- local Docker orchestration for Postgres, Redis, NATS JetStream, MinIO, API, worker, extension runtime, and web

## Status

This repository now contains the first implementation skeleton. It is control-plane first and intentionally defers production policy simulation, WASM execution, eBPF loading, billing integrations, and full remediation engines.

## Day-One Commands

```sh
make setup
make dev
pnpm generate
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm validate:capabilities
pnpm validate:policy-packs
pnpm validate:wasm-artifacts
pnpm validate:probe-profiles
```

The Go toolchain target is `go1.26.2`. If Go is not installed locally, the Docker stack uses the pinned `golang:1.26.2` image.

## What the Spec Covers

- product strategy and market input
- product positioning and personas
- platform architecture
- monorepo and backend structure
- node agent and runtime model
- frontend panel design
- data model and API contracts
- security, billing, observability, and roadmap
- implementation-readiness guidance for engineering kickoff

## Implemented Surface

- Auth: JWT-first login, refresh rotation, logout, current actor lookup, bcrypt password hashing, roles and membership schema.
- Tenancy: tenant list, create, and detail.
- Fleet: node list/detail, bootstrap token issuance, agent register/renew/heartbeat/capabilities endpoints.
- System: provider and region seed APIs, capability registry, audit listing.
- Contracts: capability manifests, `xray-adapter`, WasmEdge plugin manifests, eBPF probe profile fallback modes, remediation policy placeholders.
- Infra: `golang-migrate` migrations, `sqlc.yaml`, Docker Compose, and GitHub Actions CI.

## Entry Point

Start with the spec package in [docs/README.md](./docs/README.md).

Suggested reading order:

1. [docs/00-strategy-and-market-input.md](./docs/00-strategy-and-market-input.md)
2. [docs/01-product-overview.md](./docs/01-product-overview.md)
3. [docs/02-architecture.md](./docs/02-architecture.md)
4. [docs/14-implementation-readiness.md](./docs/14-implementation-readiness.md)

## Current Design Direction

HugeEdge is specified as:

- a composable secure edge access platform
- a governed control plane with extension boundaries
- an architecture that supports policy-driven self-healing and advanced operator workflows

It is not specified as:

- a consumer VPN product
- a stealth or circumvention system
- a fully implemented codebase

## Scope Note

This spec describes a compliant secure remote access and edge orchestration platform.
It does not include censorship-evasion, stealth transport design, fingerprint spoofing, or anti-detection features.
