# Zeta: Digital Video Coaching Platform

Zeta is a modern platform designed to revolutionize remote coaching through digital video analysis. Connect with experts, upload your training sessions, and receive precise, time-stamped feedback—anytime, anywhere.

Inspired by the need for efficient remote coaching, Zeta bridges the gap between students and mentors, eliminating travel costs and scheduling conflicts while enabling professional monetization for experts.

## Key Features

- **remote Video Analysis**: Students upload videos of their practice; coaches provide detailed feedback.
- **Professional Dashboard**: Manage students, videos, and reviews in one place.
- **Groups Management**: Create and manage user groups.
- **Seamless Uploads**: Direct high-quality video uploads powered by Mux.
- **Secure Authentication**: Enterprise-grade auth via WorkOS.

## How to start

### Prerequisites

- Docker & Docker Compose
- Go 1.25+
- Node.js & pnpm (for the dashboard)
- WorkOS Account & Project
- Mux Account

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

   # Mux Configuration
   MUX_TOKEN_ID=...
   MUX_TOKEN_SECRET=...
   ```

3. **WorkOS Configuration**:
   - In WorkOS Dashboard > Configuration > Redirect URIs:
     - Add `http://localhost:8080/auth/callback`
   - In WorkOS Dashboard > User Management > Feature Flags:
     - Create `create-asset`
     - Create `groups`
     - Create `create-group`

4. **Mux Configuration**:
   - Create an Access Token in Mux Dashboard.

### Quick Start

1. **Start Infrastructure**:

   ```bash
   make infra:up
   ```

2. **Run Migrations**:

   ```bash
   make db:migrate:up
   ```

3. **Run Backend**:
   ```bash
   make api:start
   ```
4. **Run Frontend**:
   ```bash
   make web:start
   ```
   Dashboard available at `http://localhost:4200`.

### Auth Flow

- Public: `/health`
- Protected: `/assets` (Requires Login)
- Login: Click "Login via WorkOS" -> Redirects to WorkOS AuthKit -> Callback -> Logged In.

### API Examples

Check auth status:

```bash
curl -b "zeta_session=..." http://localhost:8080/auth/me
```

## Diagrams

### Core User Journey

```mermaid
graph LR
    Student[Student] -->|Uploads Video| Zeta[Zeta Platform]
    Zeta -->|Notifies| Coach[Coach]
    Coach -->|Analyzes & Annotates| Review[Video Review]
    Review -->|Feedback| Student
```

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

The upload process is designed to ensure data consistency and clean user experience:

1. **Initiation**: Client requests upload URLs. Asset created in DB with status `waiting_upload`.
2. **Direct Upload**: Client uploads files directly to Mux storage (bypassing our API server for performance).
3. **Completion**: Client notifies API that uploads are finished via `POST /assets/{id}/complete`.
4. **Visibility**: Asset status updates to `pending` and becomes visible in the dashboard.

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
    A->>D: Create Asset (status: waiting_upload)
    loop For each file
        A->>M: Create Direct Upload
        M-->>A: Upload URL
        A->>D: Create Video (status: waiting_upload)
    end
    A-->>W: Return Upload URLs
    loop For each file
        W->>M: PUT File (Direct Upload)
        M-->>W: 200 OK
    end
    W->>A: POST /assets/{id}/complete
    A->>D: Update Asset (status: pending)
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
        enum status
        timestamp created_at
        timestamp updated_at
    }
    VIDEOS {
        uuid id PK
        uuid asset_id FK
        string mux_upload_id
        string mux_asset_id
        string playback_id
        enum status
        timestamp created_at
        timestamp updated_at
    }
```
