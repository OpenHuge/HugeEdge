# HugeEdge

HugeEdge is a monorepo for a secure edge access control plane. The current working surface includes:

- a Go admin API backed by Postgres
- a TanStack Start + Mantine operator panel
- workspace packages for API client, UI primitives, config, and shared schemas
- a modular Go control-plane API plus thin `worker`, `ext-runtime`, and `agent` binaries
- checked-in OpenAPI, database migrations, contracts, and Continue checks under `.continue/checks/`
- local Docker orchestration for Postgres and the surrounding control-plane services

## Quick Start

Install dependencies:

```sh
make setup
```

Run the full local stack with Docker:

```sh
make dev
```

The operator panel is available at `http://localhost:3000` and the API at `http://localhost:8080`.

Local demo credentials:

- email: `admin@hugeedge.local`
- password: `hugeedge`

The first successful login bootstraps the local admin account.

## Focused Development

For frontend + API work, start only Postgres and migrations in Docker, then run the app processes directly:

```sh
docker compose -f infra/docker/docker-compose.yml up -d postgres
docker compose -f infra/docker/docker-compose.yml run --rm migrate
pnpm dev:web
pnpm dev:api
```

Useful commands:

```sh
pnpm generate
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm smoke
pnpm validate:capabilities
pnpm validate:policy-packs
pnpm validate:wasm-artifacts
pnpm validate:probe-profiles
```

`pnpm smoke` starts Postgres + migrations, launches the real API and web app locally, and runs the Playwright operator smoke flow.

## Continue Checks

HugeEdge carries source-controlled Continue checks under [`.continue/checks/`](./.continue/checks/). The initial checks cover:

- control-plane API, auth, audit, and generated client alignment
- migration and sqlc/store safety
- operator shell auth and typed data-flow integrity

For local use in the devcontainer or Codespaces, the workspace installs both `codex` and the Continue CLI `cn`, and VS Code includes the `Continue.continue` extension.

Recommended local flow:

```sh
cn
```

Then run Continue's local check workflow from your agent session after editing check files or preparing a PR. To activate GitHub PR checks, connect the repository in Continue so every file in `.continue/checks/` runs as a status check on pull requests.

The Go toolchain target is `go1.26.2`. If Go is not installed locally, the Docker stack uses the pinned `golang:1.26.2` image.

## Codespaces / Devcontainer

The devcontainer installs:

- Node `24.11.1`
- Go `1.26.2`
- `pnpm`
- Playwright Chromium
- `migrate` and `sqlc`

On first create, the workspace opens the login route, overview route, and API auth handlers so the operator loop is immediately visible.

## Implemented Surface

- Auth: login, refresh rotation, logout, current actor lookup, and session-aware UI guards.
- Operator admin: overview, tenants, tenant detail, nodes, node detail, audit, and system data pages.
- Fleet: bootstrap token issuance plus agent register/renew/heartbeat/capabilities endpoints.
- System: provider, region, capability, and audit APIs.
- Contracts and infra: OpenAPI specs, SQL migrations, Docker Compose, and contract validation scripts.

## Product Docs

Start with [docs/README.md](./docs/README.md).

Suggested reading order:

1. [docs/00-strategy-and-market-input.md](./docs/00-strategy-and-market-input.md)
2. [docs/01-product-overview.md](./docs/01-product-overview.md)
3. [docs/02-architecture.md](./docs/02-architecture.md)
4. [docs/14-implementation-readiness.md](./docs/14-implementation-readiness.md)

## Scope Note

HugeEdge is specified as a compliant secure remote access and edge orchestration platform.
It does not include censorship-evasion, stealth transport design, fingerprint spoofing, or anti-detection features.
