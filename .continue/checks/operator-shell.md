---
name: Operator Shell UX Contracts
description: Ensure the admin shell preserves auth, typed data access, and operator-grade states
---

Review this pull request for regressions in the HugeEdge operator shell.

Fail the check if any of these are true:

- Operator routes under `apps/web/src/` bypass the central auth guard or break the JWT-first browser flow.
- Frontend data fetching for control-plane APIs is added or changed without going through the typed client in `packages/api-client/` and TanStack Query patterns already used in the repo.
- A user-facing admin workflow loses loading, empty, or error handling where the surrounding shell expects those states.
- A new table, status view, or admin action exposes raw backend details without operator-oriented labeling, or it omits key state like status, timestamps, tenant context, or action results when those are needed to operate the system.
- A UI change introduces a contract mismatch with backend field names or shapes that would only be caught at runtime.

Pass the check when the operator shell keeps auth, typed data flow, and predictable admin UX intact.
