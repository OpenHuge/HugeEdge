-- name: ListTenants :many
SELECT id, name, slug, status, created_at
FROM tenants
ORDER BY created_at ASC;

-- name: GetTenant :one
SELECT id, name, slug, status, created_at
FROM tenants
WHERE id = $1;

-- name: ListNodes :many
SELECT
  n.id,
  n.tenant_id,
  n.name,
  n.status,
  n.adapter_name,
  n.agent_version,
  n.runtime_version,
  n.health_status,
  n.health_score,
  n.last_heartbeat_at,
  n.created_at,
  current_bundle.bundle_version AS current_config_version,
  desired_bundle.bundle_version AS desired_config_version,
  cs.last_apply_status,
  cs.last_apply_message,
  cs.last_apply_at
FROM nodes n
LEFT JOIN node_config_states cs ON cs.node_id = n.id
LEFT JOIN config_bundles current_bundle ON current_bundle.id = cs.current_bundle_id
LEFT JOIN config_bundles desired_bundle ON desired_bundle.id = cs.desired_bundle_id
ORDER BY n.created_at ASC;

-- name: GetNode :one
SELECT
  n.id,
  n.tenant_id,
  n.name,
  n.status,
  n.adapter_name,
  n.agent_version,
  n.runtime_version,
  n.health_status,
  n.health_score,
  n.last_heartbeat_at,
  n.created_at,
  current_bundle.bundle_version AS current_config_version,
  desired_bundle.bundle_version AS desired_config_version,
  cs.last_apply_status,
  cs.last_apply_message,
  cs.last_apply_at
FROM nodes n
LEFT JOIN node_config_states cs ON cs.node_id = n.id
LEFT JOIN config_bundles current_bundle ON current_bundle.id = cs.current_bundle_id
LEFT JOIN config_bundles desired_bundle ON desired_bundle.id = cs.desired_bundle_id
WHERE n.id = $1;

-- name: ListAuditLogs :many
SELECT id, actor_id, tenant_id, action, metadata, created_at
FROM audit_logs
ORDER BY created_at DESC
LIMIT $1;

-- name: ListRollouts :many
SELECT
  r.id,
  r.tenant_id,
  r.node_id,
  n.name AS node_name,
  r.bundle_id,
  cb.bundle_version,
  cb.config,
  cb.hash,
  r.previous_bundle_id,
  r.adapter_name,
  r.status,
  r.note,
  r.created_by,
  r.rollback_of_rollout_id,
  r.created_at,
  r.completed_at,
  latest_apply.status AS last_apply_status,
  latest_apply.message AS last_apply_message,
  latest_apply.health_status,
  latest_apply.health_score,
  latest_apply.agent_version,
  latest_apply.runtime_version
FROM rollouts r
JOIN nodes n ON n.id = r.node_id
JOIN config_bundles cb ON cb.id = r.bundle_id
LEFT JOIN LATERAL (
  SELECT status, message, health_status, health_score, agent_version, runtime_version
  FROM node_config_applies
  WHERE rollout_id = r.id
  ORDER BY started_at DESC
  LIMIT 1
) latest_apply ON TRUE
WHERE r.tenant_id = $1
  AND ($2::uuid IS NULL OR r.node_id = $2::uuid)
ORDER BY r.created_at DESC;

-- name: GetRollout :one
SELECT
  r.id,
  r.tenant_id,
  r.node_id,
  n.name AS node_name,
  r.bundle_id,
  cb.bundle_version,
  cb.config,
  cb.hash,
  r.previous_bundle_id,
  r.adapter_name,
  r.status,
  r.note,
  r.created_by,
  r.rollback_of_rollout_id,
  r.created_at,
  r.completed_at,
  latest_apply.status AS last_apply_status,
  latest_apply.message AS last_apply_message,
  latest_apply.health_status,
  latest_apply.health_score,
  latest_apply.agent_version,
  latest_apply.runtime_version
FROM rollouts r
JOIN nodes n ON n.id = r.node_id
JOIN config_bundles cb ON cb.id = r.bundle_id
LEFT JOIN LATERAL (
  SELECT status, message, health_status, health_score, agent_version, runtime_version
  FROM node_config_applies
  WHERE rollout_id = r.id
  ORDER BY started_at DESC
  LIMIT 1
) latest_apply ON TRUE
WHERE r.tenant_id = $1
  AND r.id = $2;
