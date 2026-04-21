package workflows

import (
	"context"
	"log/slog"
	"time"

	"github.com/hugeedge/hugeedge/internal/platform"
)

type Runner struct {
	store *platform.Store
}

func NewRunner(store *platform.Store) Runner {
	return Runner{store: store}
}

func (r Runner) Run(ctx context.Context) {
	if r.store == nil {
		<-ctx.Done()
		return
	}

	timeoutTicker := time.NewTicker(10 * time.Second)
	defer timeoutTicker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-timeoutTicker.C:
			reports, err := r.store.FailStaleRollouts(ctx, 2*time.Minute)
			if err != nil {
				slog.Warn("failed to expire stale rollouts", "error", err)
				continue
			}
			for _, report := range reports {
				if err := r.store.Audit(ctx, report.Action, "", report.TenantID, report.Metadata); err != nil {
					slog.Warn("failed to audit rollout timeout", "error", err)
				}
			}
			if err := r.store.MarkOfflineNodes(ctx, 90*time.Second); err != nil {
				slog.Warn("failed to reconcile offline nodes", "error", err)
			}
		}
	}
}
