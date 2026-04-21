# 03. Monorepo Structure

## 3.1 Tooling

- package manager: pnpm
- task runner and build graph: Turbo
- backend: Go workspaces or multiple Go modules under `apps/` and `packages/go/`
- frontend: TanStack Start
- shared contracts: OpenAPI plus generated TypeScript clients
- linting: ESLint plus Biome or Prettier
- Go linting: golangci-lint
- CI: GitHub Actions
- releases: Changesets for JS packages, Goreleaser for Go binaries

## 3.2 Repository Layout

```text
repo/
  apps/
    web/                       # frontend shell
    api/                       # Go API server
    worker/                    # background jobs and schedulers
    ingest/                    # optional split for telemetry ingest
    agent/                     # Go node agent binary
    ext-runtime/               # isolated runtime for connectors and adapters
  packages/
    ui/                        # shared Mantine wrappers and shell primitives
    api-client/                # generated TS clients from OpenAPI
    schemas/                   # zod schemas and DTO helpers
    config/                    # environment schema and feature flags
    capability-sdk/            # extension manifests, validation, helper libs
    wasm-sdk/                  # wasm extension contracts and packaging helpers
    ebpf-schemas/              # probe profiles and telemetry schemas
    policy-packs/              # built-in policy packs and defaults
    integration-contracts/     # connector config schemas and event contracts
    docs/                      # optional local docs tooling
    go/
      auth/
      tenancy/
      billing/
      fleet/
      policy/
      quota/
      profile/
      telemetry/
      audit/
      extensions/
      workflows/
      platform/
      testkit/
  plugins/
    identity/
    billing/
    posture/
    providers/
    notifications/
    exports/
    runtimes/
    wasm/
    ui/
  infra/
    docker/
    helm/
    terraform/
    scripts/
    ci/
  openapi/
    public.yaml
    admin.yaml
    agent.yaml
    extensibility.yaml
  docs/
  turbo.json
  pnpm-workspace.yaml
  Makefile
```

## 3.3 Repository Design Rules

1. Core domain packages do not import provider-specific logic.
2. Extension packages depend on contracts and SDKs, not on internal core code.
3. UI extensions must register capability metadata instead of patching routes directly.
4. Runtime adapters must expose stable manifests and health signals.
5. WASM and eBPF artifacts must be signed and validated before rollout.

## 3.4 Backend Code Organization

Inside `apps/api`:

```text
apps/api/
  cmd/api/
  internal/
    app/
    http/
    service/
    repository/
    domain/
    workflows/
    authz/
    extensions/
    capabilities/
    simulation/
    cache/
    observability/
  migrations/
  config/
```

Guidelines:

- domain entities stay free of transport concerns
- services orchestrate use cases and approvals
- repositories encapsulate SQL
- transport adapters remain thin
- interfaces are introduced only at actual boundaries
- extension loading never reaches into domain internals directly

## 3.5 Shared Contracts

- OpenAPI is the source of truth for external APIs
- capability manifests define extension registration and compatibility
- wasm manifests and probe profiles are versioned contracts
- agent protocol can be REST plus signed bundles, with optional streaming later
- frontend uses generated clients plus capability metadata
- contract versions are explicit and semantically versioned

## 3.6 Versioning Strategy

- web app: continuous deployment
- API: backward compatible within a major version
- agent: control plane supports N-2 versions
- capability manifest schema: versioned
- policy pack format: versioned and migratable
- runtime adapter contract: versioned independently from the core release

## 3.7 Build and Generate Pipelines

Suggested tasks:

- `lint`
- `typecheck`
- `test`
- `build`
- `dev`
- `e2e`
- `storybook`
- `generate`
- `validate:capabilities`
- `validate:policy-packs`
- `validate:wasm-artifacts`
- `validate:probe-profiles`

Pipeline intent:

- `build` depends on `^build`
- `test` depends on generated contracts where relevant
- `web` build depends on generated `api-client`
- extension packages validate manifests before packaging
- deploy flows require contract validation and migration safety checks

## 3.8 Recommended DX Standards

- every package has a README
- `make setup` bootstraps the whole workspace
- seeded demo data includes extensions and capability examples
- preview environments show capability-aware UI
- contract tests cover generated clients and manifest validation
- example plugins exist for each major capability family
