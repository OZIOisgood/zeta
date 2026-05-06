# Resolution

## Summary
The group details members area now renders separate Students and Experts sections. The shared users list component no longer displays role information and can load either list type.

## Technical Details
- Added `groups:expert-list:read` to the backend and frontend permission definitions.
- Changed `GET /groups/{groupID}/users` to return only users with the `student` role and require `groups:user-list:read`.
- Added `GET /groups/{groupID}/experts` to return users with `expert` or `admin` roles and require `groups:expert-list:read`.
- Updated the dashboard users service to call the appropriate endpoint for students or experts.
- Documented the group member visibility API behavior in the root `README.md`.

## Tests
- Added backend tests for students-only filtering, experts-and-admins filtering, and expert-list permission enforcement.

## Verification
- [x] `go test ./internal/users ./internal/permissions -count=1`
- [x] `make test:unit`
- [x] `make api:build`
- [x] `make web:build`

The dashboard build completed with pre-existing Angular warnings for unused `TuiButton` imports in unrelated list components, the existing initial bundle budget warning, and the existing Agora CommonJS warning.

## Next Steps
- Configure WorkOS so expert and administrator roles include both `groups:user-list:read` and `groups:expert-list:read`, while student roles include only `groups:expert-list:read`.
