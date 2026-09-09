.PHONY: dev build run db-up db-down db-reset migrate

dev:
	docker compose up -d
	cd backend && go run .

build:
	cd backend && go build -o ../revista-server .

run:
	./revista-server

db-up:
	docker compose up -d postgres

db-down:
	docker compose down

db-reset:
	docker compose down -v
	docker compose up -d postgres

test:
	cd backend && go test ./...

clean:
	rm -f revista-server
	docker compose down -v
