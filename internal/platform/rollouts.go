package platform

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
)

func (s *Store) CreateRollout(
	ctx context.Context,
	tenantID string,
	nodeID string,
	actorID string,
	adapterName string,
	config map[string]any,
	note string,
) (Rollout, error) {
	configJSON, err := json.Marshal(config)
	if err != nil {
		return Rollout{}, err
	}

	tx, err := s.db.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return Rollout{}, err
	}
	defer rollback(ctx, tx)

	var nodeTenantID string
	var nodeName string
	var currentBundleID pgtype.UUID
	err = tx.QueryRow(ctx,
		`SELECT n.tenant_id::text, n.name,
		        (SELECT current_bundle_id FROM node_config_states WHERE node_id = n.id)
		 FROM nodes n
		 WHERE n.id = $1
		 FOR UPDATE`,
		nodeID,
	).Scan(&nodeTenantID, &nodeName, &currentBundleID)
	if errors.Is(err, pgx.ErrNoRows) {
		return Rollout{}, ErrNotFound
	}
	if err != nil {
		return Rollout{}, err
	}
	if nodeTenantID != tenantID {
		return Rollout{}, ErrNotFound
	}

	var nextBundleVersion int
	if err := tx.QueryRow(ctx,
		`SELECT COALESCE(max(bundle_version), 0) + 1 FROM config_bundles WHERE node_id = $1`,
		nodeID,
	).Scan(&nextBundleVersion); err != nil {
		return Rollout{}, err
	}

	now := time.Now()
	bundleID := uuid.NewString()
	hash := hashBytes(configJSON)
	if _, err := tx.Exec(ctx,
		`INSERT INTO config_bundles (id, tenant_id, node_id, adapter_name, bundle_version, config, hash, created_by, created_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, nullif($8, '')::uuid, $9)`,
		bundleID, tenantID, nodeID, adapterName, nextBundleVersion, configJSON, hash, actorID, now,
	); err != nil {
		return Rollout{}, err
	}

	rolloutID := uuid.NewString()
	if _, err := tx.Exec(ctx,
		`INSERT INTO rollouts (id, tenant_id, node_id, bundle_id, previous_bundle_id, adapter_name, status, note, created_by, created_at)
		 VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7, nullif($8, '')::uuid, $9)`,
		rolloutID, tenantID, nodeID, bundleID, nullableUUID(currentBundleID), adapterName, strings.TrimSpace(note), actorID, now,
	); err != nil {
		return Rollout{}, err
	}

	if _, err := tx.Exec(ctx,
		`INSERT INTO node_config_states (node_id, desired_bundle_id)
		 VALUES ($1, $2)
		 ON CONFLICT (node_id) DO UPDATE SET desired_bundle_id = EXCLUDED.desired_bundle_id`,
		nodeID, bundleID,
	); err != nil {
		return Rollout{}, err
	}

	if err := tx.Commit(ctx); err != nil {
		return Rollout{}, err
	}

	return Rollout{
		ID:            rolloutID,
		TenantID:      tenantID,
		NodeID:        nodeID,
		NodeName:      nodeName,
		BundleVersion: nextBundleVersion,
		Config:        config,
		Hash:          hash,
		AdapterName:   adapterName,
		Status:        "pending",
		Note:          strings.TrimSpace(note),
		CreatedBy:     actorID,
		CreatedAt:     now,
	}, nil
}

func (s *Store) ListRollouts(ctx context.Context, tenantID string, nodeID string) ([]Rollout, error) {
	rows, err := s.db.Query(ctx,
		`SELECT
		   r.id::text,
		   r.tenant_id::text,
		   r.node_id::text,
		   n.name,
		   cb.bundle_version,
		   cb.config,
		   cb.hash,
		   r.adapter_name,
		   r.status,
		   r.note,
		   COALESCE(r.created_by::text, ''),
		   COALESCE(r.rollback_of_rollout_id::text, ''),
		   r.created_at,
		   r.completed_at,
		   COALESCE(latest_apply.status, ''),
		   COALESCE(latest_apply.message, ''),
		   COALESCE(latest_apply.health_status, ''),
		   COALESCE(latest_apply.health_score, 0),
		   COALESCE(latest_apply.agent_version, ''),
		   COALESCE(latest_apply.runtime_version, '')
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
		   AND ($2 = '' OR r.node_id::text = $2)
		 ORDER BY r.created_at DESC`,
		tenantID, nodeID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var rollouts []Rollout
	for rows.Next() {
		rollout, err := scanRollout(rows)
		if err != nil {
			return nil, err
		}
		rollouts = append(rollouts, rollout)
	}
	return rollouts, rows.Err()
}

func (s *Store) Rollout(ctx context.Context, tenantID string, rolloutID string) (Rollout, error) {
	rows, err := s.db.Query(ctx,
		`SELECT
		   r.id::text,
		   r.tenant_id::text,
		   r.node_id::text,
		   n.name,
		   cb.bundle_version,
		   cb.config,
		   cb.hash,
		   r.adapter_name,
		   r.status,
		   r.note,
		   COALESCE(r.created_by::text, ''),
		   COALESCE(r.rollback_of_rollout_id::text, ''),
		   r.created_at,
		   r.completed_at,
		   COALESCE(latest_apply.status, ''),
		   COALESCE(latest_apply.message, ''),
		   COALESCE(latest_apply.health_status, ''),
		   COALESCE(latest_apply.health_score, 0),
		   COALESCE(latest_apply.agent_version, ''),
		   COALESCE(latest_apply.runtime_version, '')
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
		   AND r.id = $2`,
		tenantID, rolloutID,
	)
	if err != nil {
		return Rollout{}, err
	}
	defer rows.Close()
	if !rows.Next() {
		return Rollout{}, ErrNotFound
	}
	rollout, err := scanRollout(rows)
	if err != nil {
		return Rollout{}, err
	}
	return rollout, rows.Err()
}

func (s *Store) RollbackRollout(ctx context.Context, tenantID string, rolloutID string, actorID string) (Rollout, error) {
	tx, err := s.db.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return Rollout{}, err
	}
	defer rollback(ctx, tx)

	var nodeID string
	var nodeName string
	var originalBundleID string
	var previousBundleID pgtype.UUID
	var adapterName string
	var status string
	var currentBundleID pgtype.UUID
	err = tx.QueryRow(ctx,
		`SELECT r.node_id::text, n.name, r.bundle_id::text, r.previous_bundle_id, r.adapter_name, r.status,
		        (SELECT current_bundle_id FROM node_config_states WHERE node_id = r.node_id)
		 FROM rollouts r
		 JOIN nodes n ON n.id = r.node_id
		 WHERE r.id = $1
		   AND r.tenant_id = $2
		 FOR UPDATE`,
		rolloutID, tenantID,
	).Scan(&nodeID, &nodeName, &originalBundleID, &previousBundleID, &adapterName, &status, &currentBundleID)
	if errors.Is(err, pgx.ErrNoRows) {
		return Rollout{}, ErrNotFound
	}
	if err != nil {
		return Rollout{}, err
	}
	if status != "succeeded" {
		return Rollout{}, ErrConflict
	}
	if uuidString(currentBundleID) != originalBundleID {
		return Rollout{}, ErrConflict
	}
	if !previousBundleID.Valid {
		return Rollout{}, ErrConflict
	}

	var previousConfig []byte
	if err := tx.QueryRow(ctx,
		`SELECT config FROM config_bundles WHERE id = $1`,
		nullableUUID(previousBundleID),
	).Scan(&previousConfig); err != nil {
		return Rollout{}, err
	}

	var nextBundleVersion int
	if err := tx.QueryRow(ctx,
		`SELECT COALESCE(max(bundle_version), 0) + 1 FROM config_bundles WHERE node_id = $1`,
		nodeID,
	).Scan(&nextBundleVersion); err != nil {
		return Rollout{}, err
	}

	now := time.Now()
	bundleID := uuid.NewString()
	hash := hashBytes(previousConfig)
	if _, err := tx.Exec(ctx,
		`INSERT INTO config_bundles (id, tenant_id, node_id, adapter_name, bundle_version, config, hash, created_by, created_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, nullif($8, '')::uuid, $9)`,
		bundleID, tenantID, nodeID, adapterName, nextBundleVersion, previousConfig, hash, actorID, now,
	); err != nil {
		return Rollout{}, err
	}

	newRolloutID := uuid.NewString()
	if _, err := tx.Exec(ctx,
		`INSERT INTO rollouts (id, tenant_id, node_id, bundle_id, previous_bundle_id, adapter_name, status, note, created_by, rollback_of_rollout_id, created_at)
		 VALUES ($1, $2, $3, $4, $5, $6, 'pending', 'Rollback rollout', nullif($7, '')::uuid, $8, $9)`,
		newRolloutID, tenantID, nodeID, bundleID, originalBundleID, adapterName, actorID, rolloutID, now,
	); err != nil {
		return Rollout{}, err
	}

	if _, err := tx.Exec(ctx,
		`UPDATE node_config_states SET desired_bundle_id = $2 WHERE node_id = $1`,
		nodeID, bundleID,
	); err != nil {
		return Rollout{}, err
	}

	if err := tx.Commit(ctx); err != nil {
		return Rollout{}, err
	}

	var config map[string]any
	if err := json.Unmarshal(previousConfig, &config); err != nil {
		return Rollout{}, err
	}

	return Rollout{
		ID:                  newRolloutID,
		TenantID:            tenantID,
		NodeID:              nodeID,
		NodeName:            nodeName,
		BundleVersion:       nextBundleVersion,
		Config:              config,
		Hash:                hash,
		AdapterName:         adapterName,
		Status:              "pending",
		Note:                "Rollback rollout",
		CreatedBy:           actorID,
		RollbackOfRolloutID: rolloutID,
		CreatedAt:           now,
	}, nil
}

func (s *Store) NextConfig(
	ctx context.Context,
	nodeID string,
	currentConfigVersion int,
	agentVersion string,
	runtimeVersion string,
) (*ConfigBundle, error) {
	tx, err := s.db.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return nil, err
	}
	defer rollback(ctx, tx)

	var rolloutID string
	var bundle ConfigBundle
	var configJSON []byte
	err = tx.QueryRow(ctx,
		`SELECT r.id::text, cb.bundle_version, cb.adapter_name, cb.config, cb.hash, cb.created_at
		 FROM node_config_states cs
		 JOIN config_bundles cb ON cb.id = cs.desired_bundle_id
		 JOIN rollouts r ON r.bundle_id = cb.id AND r.node_id = cs.node_id
		 WHERE cs.node_id = $1
		   AND (cs.current_bundle_id IS DISTINCT FROM cs.desired_bundle_id)
		 ORDER BY r.created_at DESC
		 LIMIT 1
		 FOR UPDATE`,
		nodeID,
	).Scan(&rolloutID, &bundle.BundleVersion, &bundle.AdapterName, &configJSON, &bundle.Hash, &bundle.IssuedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		if _, err := tx.Exec(ctx,
			`UPDATE nodes
			 SET agent_version = $2,
			     runtime_version = $3
			 WHERE id = $1`,
			nodeID, agentVersion, runtimeVersion,
		); err != nil {
			return nil, err
		}
		if err := tx.Commit(ctx); err != nil {
			return nil, err
		}
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	if currentConfigVersion >= bundle.BundleVersion {
		if err := tx.Commit(ctx); err != nil {
			return nil, err
		}
		return nil, nil
	}

	if err := json.Unmarshal(configJSON, &bundle.Config); err != nil {
		return nil, err
	}
	if _, err := tx.Exec(ctx,
		`UPDATE rollouts SET status = CASE WHEN status = 'pending' THEN 'awaiting_apply' ELSE status END WHERE id = $1`,
		rolloutID,
	); err != nil {
		return nil, err
	}
	if _, err := tx.Exec(ctx,
		`UPDATE nodes
		 SET agent_version = $2,
		     runtime_version = $3
		 WHERE id = $1`,
		nodeID, agentVersion, runtimeVersion,
	); err != nil {
		return nil, err
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	return &bundle, nil
}

func (s *Store) ReportConfig(
	ctx context.Context,
	nodeID string,
	bundleVersion int,
	status string,
	message string,
	healthStatus string,
	healthScore int,
	agentVersion string,
	runtimeVersion string,
) (ConfigReport, error) {
	tx, err := s.db.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return ConfigReport{}, err
	}
	defer rollback(ctx, tx)

	var rolloutID string
	var tenantID string
	var bundleID string
	var previousBundleID pgtype.UUID
	err = tx.QueryRow(ctx,
		`SELECT r.id::text, r.tenant_id::text, cb.id::text, r.previous_bundle_id
		 FROM rollouts r
		 JOIN config_bundles cb ON cb.id = r.bundle_id
		 WHERE r.node_id = $1
		   AND cb.bundle_version = $2
		 ORDER BY r.created_at DESC
		 LIMIT 1
		 FOR UPDATE`,
		nodeID, bundleVersion,
	).Scan(&rolloutID, &tenantID, &bundleID, &previousBundleID)
	if errors.Is(err, pgx.ErrNoRows) {
		return ConfigReport{}, ErrNotFound
	}
	if err != nil {
		return ConfigReport{}, err
	}

	finishedAt := any(nil)
	if status != "in_progress" {
		finishedAt = time.Now()
	}
	if _, err := tx.Exec(ctx,
		`INSERT INTO node_config_applies (id, node_id, rollout_id, bundle_id, status, message, health_status, health_score, agent_version, runtime_version, finished_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
		uuid.NewString(), nodeID, rolloutID, bundleID, status, message, healthStatus, healthScore, agentVersion, runtimeVersion, finishedAt,
	); err != nil {
		return ConfigReport{}, err
	}

	switch status {
	case "in_progress":
		if _, err := tx.Exec(ctx,
			`UPDATE rollouts SET status = 'in_progress' WHERE id = $1`,
			rolloutID,
		); err != nil {
			return ConfigReport{}, err
		}
		if _, err := tx.Exec(ctx,
			`UPDATE nodes
			 SET agent_version = $2,
			     runtime_version = $3
			 WHERE id = $1`,
			nodeID, agentVersion, runtimeVersion,
		); err != nil {
			return ConfigReport{}, err
		}
	case "succeeded":
		if _, err := tx.Exec(ctx,
			`UPDATE node_config_states
			 SET current_bundle_id = $2,
			     desired_bundle_id = $2,
			     last_known_good_bundle_id = $2,
			     last_apply_status = 'succeeded',
			     last_apply_message = $3,
			     last_apply_at = now()
			 WHERE node_id = $1`,
			nodeID, bundleID, message,
		); err != nil {
			return ConfigReport{}, err
		}
		if _, err := tx.Exec(ctx,
			`UPDATE nodes
			 SET agent_version = $2,
			     runtime_version = $3,
			     health_status = $4,
			     health_score = $5
			 WHERE id = $1`,
			nodeID, agentVersion, runtimeVersion, healthStatus, healthScore,
		); err != nil {
			return ConfigReport{}, err
		}
		if _, err := tx.Exec(ctx,
			`UPDATE rollouts SET status = 'succeeded', completed_at = now() WHERE id = $1`,
			rolloutID,
		); err != nil {
			return ConfigReport{}, err
		}
	case "failed":
		if _, err := tx.Exec(ctx,
			`UPDATE node_config_states
			 SET last_apply_status = 'failed',
			     last_apply_message = $2,
			     last_apply_at = now()
			 WHERE node_id = $1`,
			nodeID, message,
		); err != nil {
			return ConfigReport{}, err
		}
		if _, err := tx.Exec(ctx,
			`UPDATE nodes
			 SET agent_version = $2,
			     runtime_version = $3,
			     health_status = $4,
			     health_score = $5
			 WHERE id = $1`,
			nodeID, agentVersion, runtimeVersion, healthStatus, healthScore,
		); err != nil {
			return ConfigReport{}, err
		}
		if _, err := tx.Exec(ctx,
			`UPDATE rollouts SET status = 'failed', completed_at = now() WHERE id = $1`,
			rolloutID,
		); err != nil {
			return ConfigReport{}, err
		}
	case "rolled_back":
		if _, err := tx.Exec(ctx,
			`UPDATE node_config_states
			 SET current_bundle_id = $2,
			     desired_bundle_id = $2,
			     last_known_good_bundle_id = $2,
			     last_apply_status = 'rolled_back',
			     last_apply_message = $3,
			     last_apply_at = now()
			 WHERE node_id = $1`,
			nodeID, nullableUUID(previousBundleID), message,
		); err != nil {
			return ConfigReport{}, err
		}
		if _, err := tx.Exec(ctx,
			`UPDATE nodes
			 SET agent_version = $2,
			     runtime_version = $3,
			     health_status = 'degraded',
			     health_score = 70
			 WHERE id = $1`,
			nodeID, agentVersion, runtimeVersion,
		); err != nil {
			return ConfigReport{}, err
		}
		if _, err := tx.Exec(ctx,
			`UPDATE rollouts SET status = 'rolled_back', completed_at = now() WHERE id = $1`,
			rolloutID,
		); err != nil {
			return ConfigReport{}, err
		}
	default:
		return ConfigReport{}, errors.New("invalid config report status")
	}

	if err := tx.Commit(ctx); err != nil {
		return ConfigReport{}, err
	}

	return ConfigReport{
		TenantID: tenantID,
		Action:   configReportAction(status),
		Metadata: map[string]any{
			"rolloutId":     rolloutID,
			"nodeId":        nodeID,
			"bundleVersion": bundleVersion,
			"message":       message,
			"healthStatus":  healthStatus,
			"healthScore":   healthScore,
		},
	}, nil
}

func (s *Store) FailStaleRollouts(ctx context.Context, olderThan time.Duration) ([]ConfigReport, error) {
	rows, err := s.db.Query(ctx,
		`SELECT r.id::text, r.tenant_id::text, r.node_id::text, cb.id::text, cb.bundle_version
		 FROM rollouts r
		 JOIN config_bundles cb ON cb.id = r.bundle_id
		 WHERE r.status IN ('awaiting_apply', 'in_progress')
		   AND r.created_at < $1`,
		time.Now().Add(-olderThan),
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	type staleRollout struct {
		ID            string
		TenantID      string
		NodeID        string
		BundleID      string
		BundleVersion int
	}
	var stale []staleRollout
	for rows.Next() {
		var item staleRollout
		if err := rows.Scan(&item.ID, &item.TenantID, &item.NodeID, &item.BundleID, &item.BundleVersion); err != nil {
			return nil, err
		}
		stale = append(stale, item)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	reports := make([]ConfigReport, 0, len(stale))
	for _, item := range stale {
		tx, err := s.db.BeginTx(ctx, pgx.TxOptions{})
		if err != nil {
			return nil, err
		}
		func() {
			defer rollback(ctx, tx)
			if _, err = tx.Exec(ctx,
				`INSERT INTO node_config_applies (id, node_id, rollout_id, bundle_id, status, message, health_status, health_score, finished_at)
				 VALUES ($1, $2, $3, $4, 'failed', 'rollout timed out', 'degraded', 70, now())`,
				uuid.NewString(), item.NodeID, item.ID, item.BundleID,
			); err != nil {
				return
			}
			if _, err = tx.Exec(ctx,
				`UPDATE node_config_states
				 SET desired_bundle_id = current_bundle_id,
				     last_apply_status = 'failed',
				     last_apply_message = 'rollout timed out',
				     last_apply_at = now()
				 WHERE node_id = $1`,
				item.NodeID,
			); err != nil {
				return
			}
			if _, err = tx.Exec(ctx,
				`UPDATE nodes
				 SET health_status = 'degraded',
				     health_score = 70
				 WHERE id = $1`,
				item.NodeID,
			); err != nil {
				return
			}
			if _, err = tx.Exec(ctx,
				`UPDATE rollouts
				 SET status = 'failed',
				     completed_at = now()
				 WHERE id = $1`,
				item.ID,
			); err != nil {
				return
			}
			err = tx.Commit(ctx)
		}()
		if err != nil {
			return nil, err
		}
		reports = append(reports, ConfigReport{
			TenantID: item.TenantID,
			Action:   "rollout.timeout",
			Metadata: map[string]any{
				"rolloutId":     item.ID,
				"nodeId":        item.NodeID,
				"bundleVersion": item.BundleVersion,
				"message":       "rollout timed out",
			},
		})
	}
	return reports, nil
}

func (s *Store) MarkOfflineNodes(ctx context.Context, olderThan time.Duration) error {
	_, err := s.db.Exec(ctx,
		`UPDATE nodes
		 SET status = 'offline',
		     health_status = 'offline',
		     health_score = 0
		 WHERE last_heartbeat_at IS NULL
		    OR last_heartbeat_at < $1`,
		time.Now().Add(-olderThan),
	)
	return err
}

func configReportAction(status string) string {
	switch status {
	case "in_progress":
		return "node.config_apply.started"
	case "succeeded":
		return "node.config_apply.succeeded"
	case "failed":
		return "node.config_apply.failed"
	case "rolled_back":
		return "node.config_apply.rolled_back"
	default:
		return "node.config_apply.unknown"
	}
}

func hashBytes(data []byte) string {
	sum := sha256.Sum256(data)
	return hex.EncodeToString(sum[:])
}

func nullableUUID(value pgtype.UUID) any {
	if !value.Valid {
		return nil
	}
	return uuidString(value)
}

func scanRollout(scanner interface {
	Scan(dest ...any) error
}) (Rollout, error) {
	var rollout Rollout
	var configJSON []byte
	var completedAt pgtype.Timestamptz
	if err := scanner.Scan(
		&rollout.ID,
		&rollout.TenantID,
		&rollout.NodeID,
		&rollout.NodeName,
		&rollout.BundleVersion,
		&configJSON,
		&rollout.Hash,
		&rollout.AdapterName,
		&rollout.Status,
		&rollout.Note,
		&rollout.CreatedBy,
		&rollout.RollbackOfRolloutID,
		&rollout.CreatedAt,
		&completedAt,
		&rollout.LastApplyStatus,
		&rollout.LastApplyMessage,
		&rollout.HealthStatus,
		&rollout.HealthScore,
		&rollout.AgentVersion,
		&rollout.RuntimeVersion,
	); err != nil {
		return Rollout{}, err
	}
	rollout.CompletedAt = timePtrFromTimestamptz(completedAt)
	if len(configJSON) > 0 {
		if err := json.Unmarshal(configJSON, &rollout.Config); err != nil {
			return Rollout{}, err
		}
	}
	return rollout, nil
}
