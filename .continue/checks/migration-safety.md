---
name: Migration Safety
description: Flag schema and persistence changes that are unsafe for HugeEdge's Postgres-first control plane
---

Review this pull request for data-model and migration safety.

Fail the check if any of these are true:

- A schema change modifies persisted control-plane data without updating `db/migrations/`, `db/queries/core.sql`, or generated sqlc code when those artifacts should change together.
- A migration drops tables, columns, indexes, or constraints used by the current code without a compatible transition plan.
- A migration or query changes one of the init-phase tables (`users`, `user_sessions`, `refresh_tokens`, `tenants`, `roles`, `memberships`, `providers`, `regions`, `nodes`, `node_capabilities`, `audit_logs`, `outbox_events`, `bootstrap_tokens`) in a way the current Go store layer no longer matches.
- SQL is built with ad hoc string concatenation in Go instead of living in sqlc-managed queries, unless the usage is clearly constant and not parameterized.
- New persistence logic skips tenant scoping, actor attribution, expiry handling, or audit metadata where those concerns are already part of the surrounding platform patterns.

Be strict about destructive migrations, query/schema drift, and store-layer mismatches. Do not fail the check for additive placeholder tables or forward-compatible nullable columns.
