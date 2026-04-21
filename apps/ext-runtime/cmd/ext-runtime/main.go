package main

import (
	"context"
	"log/slog"
	"os"
	"os/signal"
	"syscall"

	"github.com/hugeedge/hugeedge/internal/extensions"
)

func main() {
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()
	runtime := extensions.NewRuntime("WasmEdge", "process")
	slog.Info("extension runtime started", "runtime", runtime.Target, "isolation", runtime.Isolation)
	runtime.Run(ctx)
}
