# Solution

## Database

- Added `group_id` column to `assets` table as a nullable UUID reference to `groups(id)`.

## Backend

- Updated `db/queries/assets.sql` to include `group_id` in `CreateAsset`.
- Updated `db/queries/groups.sql` to include `CheckUserGroup`.
- Ran `sqlc generate` to update Go models.
- Updated `internal/assets/handler.go`'s `CreateAsset` to:
  - Accept `group_id` in request body.
  - Validate `group_id` format.
  - Validate user is a member of the group using `CheckUserGroup`.
  - Insert asset with `group_id`.

## Frontend

- Updated `AssetService` to send `group_id` in `createAsset` call.
- Updated `UploadVideoPageComponent`:
  - Inject `GroupsService`.
  - Fetch user's groups on init.
  - Add `group` FormControl to the form.
  - Add `tui-select` with `tui-data-list-wrapper` and custom `tui-textfield` content for group selection with avatars.
  - Pass selected group ID to `AssetService`.

## Verification

- User should see a group selection dropdown on the upload page details step.
- Dropdown contains only groups the user belongs to.
- Dropdown items show group avatar and name.
- Selecting a group and uploading associates the asset with the group in the DB.
