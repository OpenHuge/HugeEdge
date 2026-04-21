---
name: Control Plane Contracts
description: Verify API, auth, audit, and generated client changes stay aligned with HugeEdge control-plane contracts
---

Review this pull request against HugeEdge's Phase 0 + Phase 1 control-plane contract.

Fail the check if any of these are true:

- A new or changed HTTP endpoint under `internal/platform/` is not reflected in the relevant OpenAPI file under `openapi/` when the request or response contract changed.
- An endpoint that should be operator-facing is added without preserving the JWT-first auth path: access token, rotating refresh token, actor resolution from claims, and role/tenant-aware authorization.
- Tenant, node, bootstrap token, capability, or audit behavior changes without updating the generated TypeScript client in `packages/api-client/` when the client-visible contract changed.
- A change adds or updates a control-plane mutation without writing an audit event, unless the change is explicitly read-only or clearly documented as a placeholder.
- JWT claim usage drifts from the fixed init contract: `sub`, `tenant_id`, `role_ids`, `session_id`, `token_type`, and `exp`.
- Backend validation becomes weaker for externally supplied input, especially auth, tenant creation, bootstrap token issuance, agent registration, and heartbeat payloads.

Pass the check when the PR keeps the backend handler behavior, OpenAPI, generated client, and audit/auth expectations in sync.
