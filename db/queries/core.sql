-- name: ListTenants :many
SELECT id, name, slug, status, created_at
FROM tenants
ORDER BY created_at ASC;

-- name: GetTenant :one
SELECT id, name, slug, status, created_at
FROM tenants
WHERE id = $1;

-- name: ListNodes :many
SELECT id, tenant_id, name, status, adapter_name, last_heartbeat_at, created_at
FROM nodes
ORDER BY created_at ASC;

-- name: ListAuditLogs :many
SELECT id, actor_id, tenant_id, action, metadata, created_at
FROM audit_logs
ORDER BY created_at DESC
LIMIT $1;
