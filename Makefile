# Kantin Kampus - orkestrasi lokal (butuh make; alternatif PowerShell ada di docs/LOCAL_SETUP.md)

COMPOSE := docker compose --env-file .env -f infra/compose.yaml
MIGRATE := migrate -path services/api/migrations -database "$(DATABASE_URL)"
TEST_DB_URL ?= postgres://kantin:kantin@localhost:5432/kantin_test?sslmode=disable

.PHONY: help up down ps logs migrate-up migrate-down seed dev-api dev-web test-api test-web typecheck lint e2e build

help:
	@echo "Target: up down ps logs migrate-up migrate-down seed dev-api dev-web test-api test-web typecheck lint e2e build"

up:
	$(COMPOSE) up -d

down:
	$(COMPOSE) down

ps:
	$(COMPOSE) ps

logs:
	$(COMPOSE) logs -f postgres

migrate-up:
	$(MIGRATE) up

migrate-down:
	$(MIGRATE) down 1

seed:
	cd services/api && go run ./cmd/seed

dev-api:
	cd services/api && go run ./cmd/api

dev-web:
	cd apps/web && npm run dev

test-api:
	cd services/api && KANTIN_TEST_DATABASE_URL=$(TEST_DB_URL) go test ./... -count=1

test-web:
	cd apps/web && npm run test

typecheck:
	cd apps/web && npm run typecheck

lint:
	cd services/api && go vet ./...
	cd apps/web && npm run lint

e2e:
	cd apps/web && npm run e2e

build:
	cd services/api && go build ./cmd/api ./cmd/seed
	cd apps/web && npm run build
