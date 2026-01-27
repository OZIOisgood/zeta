# Task: create_user_entity_on_auth

## Status

- [ ] Defined
- [ ] In Progress
- [x] Completed

## Description

As a developer I expect user entity to be created in my DB, after user was created.
Do not use webhooks.
My idea is that user entity could be created on first `http://localhost:8080/auth/me` request is done, if there is no user in the DB, we could create him.

## Context

- `internal/auth/handler.go`
- `db/migrations`

## Acceptance Criteria

- [x] Create `users` table in DB (using migrations).
  - id (should be the same as in workOS)
  - first name (can be taken from workOS)
  - last name (can be taken from workOS)
  - language (can be taken from `accept-language` header of `/auth/me` request)
  - avatar (can be taken from workOS, if user has used OAuth, otherwise Null)
  - create ts
  - update ts
- [x] Update `/auth/me` handler to:
  - Check if user exists in DB.
  - If not, create user with details from WorkOS and request headers.
- [x] Verify user creation on login.
