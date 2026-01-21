# Zeta

Zeta is a minimal Go + Angular starter project with WorkOS Authentication.

## How to start

### Prerequisites
- Docker & Docker Compose
- Go 1.25+
- Node.js & pnpm (for the dashboard)
- WorkOS Account & Project

### Environment Setup

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
2. Update `.env` with your WorkOS credentials:
   ```dotenv
   DB_URL=postgres://zeta:zeta@localhost:5432/zeta?sslmode=disable
   WORKOS_API_KEY=sk_test_...
   WORKOS_CLIENT_ID=client_...
   WORKOS_REDIRECT_URI=http://localhost:8080/auth/callback
   WORKOS_COOKIE_SECRET=supersecret...
   ```

3. **WorkOS Configuration**:
   - In WorkOS Dashboard > Configuration > Redirect URIs:
     - Add `http://localhost:8080/auth/callback`

### Quick Start

1. **Start Infrastructure**:
   ```bash
   make docker-up
   ```

2. **Run Migrations** (includes Counter and Sessions):
   ```bash
   make migrate-up
   ```

3. **Run Backend**:
   ```bash
   make run-api
   ```
   
4. **Run Frontend**:
   ```bash
   make dashboard-start
   ```
   Dashboard available at `http://localhost:4200`.

### Auth Flow
- Public: `/health`
- Protected: `/counter`, `/counter/increment` (Requires Login)
- Login: Click "Login via WorkOS" -> Redirects to WorkOS AuthKit -> Callback -> Logged In.

### API Examples

Check auth status:
```bash
curl -b "zeta_session=..." http://localhost:8080/auth/me
```
