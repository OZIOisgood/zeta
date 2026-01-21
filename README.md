# Zeta

Zeta is a minimal Go + Angular starter project.

## How to start

### Prerequisites
- Docker & Docker Compose
- Go 1.25+
- Node.js & pnpm (for the dashboard)
- `migrate` tool (golang-migrate)
- `sqlc` (optional, for regenerating DB code)

### Quick Start

1. **Start Infrastructure** (PostgreSQL):
   ```bash
   make docker-up
   ```

2. **Run Migrations**:
   ```bash
   make migrate-up
   ```

3. **Run Backend**:
   ```bash
   make run-api
   ```
   API will be available at `http://localhost:8080`.
   - Health check: `GET /health`
   - Counter: `GET /counter`, `POST /counter/increment`

4. **Run Frontend**:
   ```bash
   make dashboard-start
   ```
   Dashboard available at `http://localhost:4200`.

### API Examples

Get counter:
```bash
curl http://localhost:8080/counter
```

Increment counter:
```bash
curl -X POST http://localhost:8080/counter/increment
```
