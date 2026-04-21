#!/usr/bin/env bash
set -euo pipefail

COMPOSE=(docker compose -f infra/docker/docker-compose.yml)

"${COMPOSE[@]}" up -d postgres

for attempt in $(seq 1 30); do
  if "${COMPOSE[@]}" exec -T postgres pg_isready -U hugeedge -d hugeedge >/dev/null 2>&1; then
    break
  fi

  if [[ "${attempt}" == "30" ]]; then
    echo "postgres did not become ready in time" >&2
    exit 1
  fi

  sleep 1
done

"${COMPOSE[@]}" run --rm migrate >/dev/null

export DATABASE_URL="${DATABASE_URL:-postgres://hugeedge:hugeedge@127.0.0.1:5432/hugeedge?sslmode=disable}"
export HUGEEDGE_HTTP_ADDR="${HUGEEDGE_HTTP_ADDR:-127.0.0.1:8080}"
export JWT_SECRET="${JWT_SECRET:-local-dev-secret}"
export REDIS_ADDR="${REDIS_ADDR:-127.0.0.1:6379}"
export NATS_URL="${NATS_URL:-nats://127.0.0.1:4222}"
export GOFLAGS="${GOFLAGS:--buildvcs=false}"

exec go run ./apps/api/cmd/api
