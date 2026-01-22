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

## Diagrams

### System Architecture

```mermaid
graph TD
    User[User] -->|Browser| Web[Angular Dashboard]
    Web -->|HTTP API| API[Go API Server]
    API -->|SQL| DB[(PostgreSQL)]
    API -->|Auth| WorkOS[WorkOS]
    API -->|Video API| Mux[Mux]
    Web -->|Direct Upload| Mux
```

### Video Upload Flow

```mermaid
sequenceDiagram
    participant U as User
    participant W as Web App
    participant A as API
    participant D as DB
    participant M as Mux

    U->>W: Select Videos & Enter Details
    U->>W: Click Upload
    W->>A: POST /assets (Metadata)
    A->>D: Create Asset
    loop For each file
        A->>M: Create Direct Upload
        M-->>A: Upload URL
        A->>D: Create Video (waiting_upload)
    end
    A-->>W: Return Upload URLs
    loop For each file
        W->>M: PUT File (Direct Upload)
        M-->>W: 200 OK
    end
    W-->>U: Show Completion
```

### Database Schema

```mermaid
erDiagram
    ASSETS ||--|{ VIDEOS : contains
    ASSETS {
        uuid id PK
        string name
        string description
        timestamp created_at
        timestamp updated_at
    }
    VIDEOS {
        uuid id PK
        uuid asset_id FK
        string mux_upload_id
        string mux_asset_id
        enum status
        timestamp created_at
        timestamp updated_at
    }
    COUNTERS {
        int id PK
        int value
        timestamp updated_at
    }
```
