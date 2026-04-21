package platform

import (
	migrate "github.com/golang-migrate/migrate/v4"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/nats-io/nats.go"
	"github.com/redis/go-redis/v9"
	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/trace"
)

type Dependencies struct {
	DB      *pgxpool.Pool
	Redis   *redis.Client
	NATS    *nats.Conn
	Tracer  trace.Tracer
	Migrate *migrate.Migrate
}

func BootstrapTelemetry(serviceName string) trace.Tracer {
	return otel.Tracer(serviceName)
}
