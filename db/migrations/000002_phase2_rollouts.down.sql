DROP TABLE IF EXISTS node_config_applies;
DROP TABLE IF EXISTS node_config_states;
DROP TABLE IF EXISTS rollouts;
DROP TABLE IF EXISTS config_bundles;

ALTER TABLE nodes
  DROP COLUMN IF EXISTS health_score,
  DROP COLUMN IF EXISTS health_status,
  DROP COLUMN IF EXISTS runtime_version,
  DROP COLUMN IF EXISTS agent_version;
