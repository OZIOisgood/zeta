# Resolution: Refactor Feature Flags to RBAC

## Backend Changes

### 1. New Permissions Module

Created `internal/permissions/permissions.go`:

- Defined **Roles**: `admin`, `expert`, `student`.
- Defined **Permissions**: `assets:create`, `groups:create`, `groups:read`, `reviews:create`, `reviews:read`.
- Implemented `HasPermission(role, permission)` function.

### 2. Authentication Refactoring (`internal/auth`)

- **Handler (`handler.go`)**:
  - Implemented `ensureUserInOrg`: Automatically adds new users to the organization specified by `DEFAULT_ORG_ID` with the `student` role.
  - Updated `Me` endpoint: Checks if the user's role in the JWT matches their actual WorkOS role. If not, it refreshes the JWT (preserving `sid`).
- **Middleware (`middleware.go`)**:
  - Updated `UserContext` to include `Role` and `SID` from JWT claims.

### 3. Service Updates

- **Assets**: `CreateAsset` now checks `permissions.AssetsCreate`.
- **Groups**: `CreateGroup` now checks `permissions.GroupsCreate`.
- **Reviews**: Removed `features` dependency; `CreateReview` now checks `permissions.ReviewsCreate`.
- **Deleted**: `internal/features` package and its API route.

## Frontend Changes

### 1. Permissions Service

- Created `web/dashboard/src/app/shared/services/permissions.service.ts`.
- Maps roles (`admin`, `expert`, `student`) to permissions locally.

### 2. Auth Service

- Updated `User` interface to include `role` and `profile_picture_url`.
- Removed dependency on `FeatureService`.

### 3. Application Updates

- Replaced `FeatureHandler` with `PermissionsService`.
- Replaced `featureGuard` with `permissionGuard` in specific routes (`upload-video`, `create-group`).
- Updated `NavbarComponent`, `HomePageComponent`, `GroupsPageComponent`, and `AssetDetailsPageComponent` to use permission checks.

## Configuration

- Added `DEFAULT_ORG_ID` to `.env` and `.env.example`.
- Removed obsolete Feature Flags configuration instructions.
