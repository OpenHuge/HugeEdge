package main

import (
	"context"
	"log/slog"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/hugeedge/hugeedge/internal/fleet"
)

func main() {
	cfg := fleet.LoadAgentConfig()
	client := fleet.NewAgentClient(cfg)
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	if err := client.Register(ctx); err != nil {
		slog.Warn("agent registration failed", "error", err)
	}
	if err := client.PublishCapabilities(ctx); err != nil {
		slog.Warn("capability publish failed", "error", err)
	}

	ticker := time.NewTicker(cfg.HeartbeatInterval)
	defer ticker.Stop()
	slog.Info("agent started", "control_plane", cfg.ControlPlaneURL, "adapter", cfg.AdapterName)
	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			if err := client.Heartbeat(ctx); err != nil {
				slog.Warn("heartbeat failed", "error", err)
			}
		}
	}
}
