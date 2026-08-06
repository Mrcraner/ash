.PHONY: tidy build-backend run-user run-agent run-community run-runtime run-frontend smoke smoke-runtime

tidy:
	cd backend && go mod tidy

build-backend:
	cd backend && go build -o bin/user-service.exe ./services/user/cmd
	cd backend && go build -o bin/agent-service.exe ./services/agent/cmd
	cd backend && go build -o bin/community-service.exe ./services/community/cmd
	cd backend && go build -o bin/ash-runtime.exe ./services/runtime/cmd

run-user:
	cd backend/services/user && go run ./cmd

run-agent:
	cd backend/services/agent && go run ./cmd

run-community:
	cd backend/services/community && go run ./cmd

run-runtime:
	cd backend/services/runtime && go run ./cmd

run-frontend:
	cd frontend && npm run dev

# Requires MySQL reachable per backend/*/configs/config.yaml
smoke:
	powershell -ExecutionPolicy Bypass -File ./scripts/smoke-test.ps1

smoke-runtime:
	powershell -ExecutionPolicy Bypass -File ./scripts/runtime-smoke.ps1

compose-up:
	docker compose -f deploy/docker-compose.yml up -d --build

compose-down:
	docker compose -f deploy/docker-compose.yml down
