PNPM ?= pnpm
COMPOSE ?= docker compose -f infra/docker/docker-compose.yml

.PHONY: setup dev down generate lint typecheck test build migrate-up

setup:
	corepack enable
	corepack prepare pnpm@10.33.0 --activate
	$(PNPM) install

dev:
	$(COMPOSE) up --build

down:
	$(COMPOSE) down --remove-orphans

generate:
	$(PNPM) generate

lint:
	$(PNPM) lint

typecheck:
	$(PNPM) typecheck

test:
	$(PNPM) test

build:
	$(PNPM) build

migrate-up:
	migrate -path db/migrations -database "$$DATABASE_URL" up
