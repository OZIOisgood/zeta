include .env
export

api\:fmt:
	go fmt ./...

api\:build:
	@mkdir -p bin
	go build -o bin/api ./cmd/api

api\:start:
	go run ./cmd/api

web\:build:
	cd web/dashboard && pnpm install && pnpm run build

web\:start:
	cd web/dashboard && pnpm install && pnpm run start

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

