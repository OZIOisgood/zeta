include .env
export

api\:fmt:
	go fmt ./...

api\:build:
	@mkdir -p bin
	go build -o bin/api ./cmd/api

api\:start:
	go run ./cmd/api

api\:dev:
	go tool air -c .air.toml

email\:preview:
	go run ./cmd/email-preview

api\:stop:
	@kill $$(lsof -ti :8080) 2>/dev/null || true

api\:restart:
	@kill $$(lsof -ti :8080) 2>/dev/null || true
	@sleep 1
	go run ./cmd/api

api\:openapi\:lint:
	pnpm --package=@redocly/cli@2 dlx redocly lint docs/openapi.yaml

web-next\:build:
	cd web/dashboard-next && pnpm install && pnpm run build

web-next\:lint:
	cd web/dashboard-next && pnpm install && pnpm run lint

web-next\:start:
	cd web/dashboard-next && pnpm install && pnpm run start

web-next\:test:
	cd web/dashboard-next && pnpm install && pnpm run test:ci

web-next\:storybook:
	cd web/dashboard-next && pnpm install && pnpm run storybook

web-next\:storybook\:build:
	cd web/dashboard-next && pnpm install && pnpm run build-storybook

infra\:up:
	docker-compose -f ./infra/docker-compose.yml up -d --build

infra\:down:
	docker-compose -f ./infra/docker-compose.yml down

infra\:clean:
	docker-compose -f ./infra/docker-compose.yml down -v

infra\:restart:
	$(MAKE) infra:clean
	$(MAKE) infra:up
	@echo "Waiting for database to be ready..."
	@sleep 5
	$(MAKE) db:migrate:up

db\:sqlc:
	sqlc generate

db\:migrate\:create:
	@read -p "Enter migration name: " name; \
	migrate create -ext sql -dir db/migrations -seq $$name

db\:migrate\:up:
	migrate -path db/migrations -database "$(DB_URL)" up

db\:migrate\:down:
	migrate -path db/migrations -database "$(DB_URL)" down 1

db\:migrate\:reset:
	migrate -path db/migrations -database "$(DB_URL)" down

test\:unit:
	go test ./... -count=1

test\:integration:
	go test -tags=integration ./... -count=1

test\:coverage:
	mkdir -p coverage
	go test ./... -count=1 -coverprofile=coverage/coverage.out
	go tool cover -func=coverage/coverage.out
	go tool cover -html=coverage/coverage.out -o coverage/coverage.html

mocks:
	go generate ./internal/...
