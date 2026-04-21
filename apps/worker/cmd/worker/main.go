package main

import (
	"context"
	"log/slog"
	"os"
	"os/signal"
	"syscall"

	"github.com/hugeedge/hugeedge/internal/workflows"
)

func main() {
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()
	runner := workflows.NewRunner()
	slog.Info("worker started", "nats_url", getenv("NATS_URL", "nats://localhost:4222"))
	runner.Run(ctx)
}

func getenv(key string, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}
