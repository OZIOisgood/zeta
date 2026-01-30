# Refactor Feature Flags to RBAC

## Context

The application relied on WorkOS Feature Flags to control access to features like creating assets, creating groups, and posting reviews. This approach proved unreliable (flags disappearing) and led to architectural complexity.

## Goal

Replace the external Feature Flags system with an internal Role-Based Access Control (RBAC) system.

## Requirements

1.  **Remove Feature Flags Service**: Delete `internal/features` and stop calling WorkOS for feature evaluation.
2.  **Internal Permissions**: Define permissions in the code (`internal/permissions`) and map them to WorkOS Roles (`student`, `expert`, `admin`).
    - **Student**: Can create assets, read groups, read reviews.
    - **Expert**: Can create groups, read groups, create/read reviews.
    - **Admin**: Full access.
3.  **Authentication Update**:
    - Fetch User Role from WorkOS during login/callback.
    - Automatically add users to a Default Organization if they are not members.
    - Include `role` and `sid` in the JWT and User Context.
4.  **Frontend Update**:
    - Update `AuthService` to expose user role.
    - Create `PermissionsService` to evaluate permissions locally based on role.
    - Update Guards (`permissionGuard`) and UI components to use permission checks.
5.  **Environment**: Add `DEFAULT_ORG_ID` to `.env`.
