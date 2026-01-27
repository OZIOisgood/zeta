# Resolution

## Summary

Implemented user entity persistence, storage, and usage across the full stack. The user is lazily created in the database upon the first authenticated request to `/auth/me`.

## Technical Details

### Database

- Created migration `20260127175500_create_users.up.sql` to define the `users` table.
- Schema includes: `id`, `first_name`, `last_name`, `email`, `language`, `avatar` (BYTEA), timestamps.
- Added `db/queries/users.sql` for CRUD operations.

### Backend (Golang)

- **Auth Handler**:
  - `Me` endpoint checks for user existence.
  - Creates user if missing, using WorkOS data (claims) and `Accept-Language` header.
  - **Language Negotiation**: Implemented `internal/tools/language.go` to match user preference against `SUPPORTED_LANGUAGES` env var.
  - **Avatar Storage**: Fetches the avatar from the URL provided by WorkOS and stores the raw bytes in the DB.
- **Middleware**:
  - Updated `UserContext` to remove `Name` and include split `FirstName`/`LastName`.
- **Refactoring**:
  - Updated `internal/assets/handler.go` to construct full names from parts.

### Frontend (Angular)

- Updated `User` interface to use snake_case properties matching the API (`first_name`, `last_name`, `language`).
- Updated `NavbarComponent` to display the avatar using a data URI (`data:image/png;base64,...`) constructed from the binary data returned by the API.

## Verification

- [x] Backend build passed (`make api:build`).
- [x] Frontend build passed (`make web:build`).
- [x] Verified user creation logic, avatar downloading, and language filtering.
