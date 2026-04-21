# 09. Installation and Operations

## 9.1 Environments

- local
- staging
- production
- optional regional production slices

## 9.2 Local Development

### Requirements
- Go
- Node.js LTS
- pnpm
- Docker / Docker Compose
- Make

### Bootstrap
```bash
make setup
make dev
```

Expected local services:
- Postgres
- Redis
- NATS
- MinIO or local object storage emulator
- API
- worker
- ext-runtime
- web

## 9.3 Production Deployment Model

### Control Plane
Deploy as Kubernetes workloads or Nomad jobs:
- `api`
- `worker`
- `scheduler`
- `ingest` optional
- `web`
- `ext-runtime`

### Managed services
- Postgres managed
- Redis managed
- object storage managed
- SMTP provider
- billing provider
- monitoring stack
- incident paging integration

## 9.4 Infra as Code

Terraform modules:
- network
- load balancer
- k8s cluster
- postgres
- redis
- object storage
- secrets manager
- DNS
- alerting integrations

Helm charts:
- web
- api
- worker
- ingest
- nats
- exporters

## 9.5 Database Migration Policy

- forward-only migrations in production
- reversible where feasible in staging
- migration CI against sanitized snapshot
- no app release without migration compatibility check
- large backfills async and feature-flagged

## 9.6 Secrets Management

Store only references where possible:
- use cloud secrets manager / Vault
- rotate bootstrap signing keys
- rotate DB creds
- rotate webhook secrets
- rotate agent cert CA per policy

## 9.7 Release Process

### Web
- merge to main
- CI build/test
- deploy canary
- promote to full

### Backend
- build immutable image
- run migrations
- deploy api
- deploy worker
- deploy ext-runtime
- verify health
- enable feature flag

### Agent
- publish binary
- update release metadata
- canary rollout by node group
- monitor reconnect / health
- promote stable
- keep remediation policy compatible with the new release

## 9.8 Incident Operations

Incident severities:
- Sev1: platform-wide outage
- Sev2: major regional degradation
- Sev3: tenant-impacting bug
- Sev4: minor issue / degraded feature

Playbooks required:
- DB saturation
- Redis outage
- broker lag
- webhook storm
- node flapping
- bad rollout
- billing webhook failure
- object storage unavailability

## 9.9 Backup and Restore

- Postgres PITR
- daily logical backup for key tables
- object storage versioning
- config artifacts retained for rollback
- documented restore drill monthly

## 9.10 Data Export and Reporting

- tenant usage CSV
- invoice export
- node inventory export
- audit export
- diagnostics bundle

Large exports should be async jobs with downloadable artifact links.

## 9.11 Self-Healing Operations

Every environment should define:

- default remediation policy
- allowed automated actions
- retry budgets by failure class
- quarantine rules
- provider replacement policy
- detector confidence thresholds
- paging and escalation destinations

Minimum runbooks:

- repeated runtime crash loop
- agent unreachable
- failed config apply with rollback
- certificate rotation failure
- regional network degradation
- disk pressure and log growth
- stuck quarantined node

## 9.12 Environment Promotion Gates

Before promoting major platform changes:

1. validate policy simulation behavior
2. validate remediation policy compatibility
3. validate agent and runtime adapter N-2 support
4. validate rollback path
5. validate dashboards and alerts for the new capability
6. validate wasm signature and compatibility checks
7. validate eBPF safe-mode behavior and rollback
8. validate deterministic fallback when heuristic detection is unavailable
