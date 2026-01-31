# Zeta: Digital Video Coaching Platform

Zeta is a modern platform designed to revolutionize remote coaching through digital video analysis. Connect with experts, upload your training sessions, and receive precise, time-stamped feedback—anytime, anywhere.

Inspired by the need for efficient remote coaching, Zeta bridges the gap between students and mentors, eliminating travel costs and scheduling conflicts while enabling professional monetization for experts.

## Key Features

- **remote Video Analysis**: Students upload videos of their practice; coaches provide detailed feedback.
- **Professional Dashboard**: Manage students, videos, and reviews in one place.
- **Groups Management**: Create and manage user groups.
- **Seamless Uploads**: Direct high-quality video uploads powered by Mux.
- **Secure Authentication**: Enterprise-grade auth via WorkOS.
- **Video Reviews**: Add comments and feedback directly to video clips.

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
2. Update `.env` with your WorkOS credentials.

3. **WorkOS Configuration**:
   - In WorkOS Dashboard > Configuration > Redirect URIs:
     - Add `http://localhost:8080/auth/callback`
   - In WorkOS Dashboard > Organization:
     - Ensure you have an Organization created (use its ID for `DEFAULT_ORG_ID`).
   - In WorkOS Dashboard > User Management > Roles:
     - Create Role `admin`
     - Create Role `expert`
     - Create Role `student` (Default)

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
    API -->|Email| Resend[Resend]
    API -->|Auth| WorkOS[WorkOS]
    API -->|Video API| Mux[Mux]
    Web -->|Direct Upload| Mux
```

### Asset Lifecycle

Assets go through a simple three-state lifecycle:

1. **Waiting Upload** (`waiting_upload`): Files are being uploaded to Mux
2. **Pending Review** (`pending`): Files are uploaded and ready for expert review
3. **Reviewed** (`completed`): Expert has reviewed and the asset is finalized

### Video Upload Flow

The upload process is designed to ensure data consistency and clean user experience:

1. **Initiation**: Client requests upload URLs. Asset created in DB with status `waiting_upload`.
2. **Direct Upload**: Client uploads files directly to Mux storage (bypassing our API server for performance).
3. **Completion**: Client notifies API that uploads are finished via `POST /assets/{id}/complete`.
4. **Visibility**: Asset status updates to `pending` (awaiting review) and becomes visible in the dashboard.
5. **Review**: Expert adds reviews/comments to the asset.
6. **Finalization**: Expert marks asset as reviewed via `POST /assets/{id}/finalize`, status changes to `completed`.

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

    Note over U,W: Expert Reviews Phase
    U->>W: Add review comments
    W->>A: POST /assets/{id}/videos/{videoId}/reviews
    A->>D: Create Review

    U->>W: Mark as Reviewed
    W->>A: POST /assets/{id}/finalize
    A->>D: Update Asset (status: completed)
    W-->>U: Asset Finalized
```

## Database Schema

```mermaid
erDiagram
    users ||--o{ groups : owns
    users ||--o{ user_groups : "member of"
    groups ||--o{ user_groups : has
    users ||--o{ assets : owns
    groups ||--o{ assets : contains
    assets ||--|{ videos : contains
    videos ||--o{ video_reviews : has

    users["User Identity (WorkOS)"] {
        string id PK "WorkOS User ID"
        string email
        string first_name
        string last_name
    }

    user_preferences {
        string user_id PK, FK "WorkOS User ID ref"
        enum language "en, de, fr"
        timestamp created_at
        timestamp updated_at
    }

    users ||--|| user_preferences : "has settings"

    groups {
        uuid id PK
        string name
        string owner_id FK "WorkOS User ID ref"
        bytea avatar
        timestamp created_at
        timestamp updated_at
    }

    user_groups {
        string user_id PK, FK "WorkOS User ID ref"
        uuid group_id PK, FK
        timestamp created_at
    }

    assets {
        uuid id PK
        string name
        string description
        enum status
        uuid group_id FK
        string owner_id FK "WorkOS User ID ref"
        timestamp created_at
        timestamp updated_at
    }

    videos {
        uuid id PK
        uuid asset_id FK
        string mux_upload_id
        string mux_asset_id
        string playback_id
        enum status
        timestamp created_at
        timestamp updated_at
    }

    video_reviews {
        uuid id PK
        uuid video_id FK
        string content
        timestamp created_at
        timestamp updated_at
    }
```
