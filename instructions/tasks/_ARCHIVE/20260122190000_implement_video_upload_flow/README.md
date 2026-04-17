# Implement Video Upload Flow

## Description

Implement a video upload workflow with the following steps:

1.  **Selection**: The user selects a video file.
2.  **Details**: The user enters a title and description.
3.  **Upload**: The user waits for all video uploads to complete.
4.  **Completion**: Upon success, the user is redirected to the home page.

## Backend Requirements

- Create `assets` and `videos` tables in the database.
- An `Asset` entity may contain multiple `Video` entities.

## Frontend Requirements

- Integrate Mux for video storage using Direct Upload.
- Use the `tui-files` component to display the video upload status in the final step.

## Documentation

- [Taiga UI Documentation](https://taiga-ui.dev)
- [Mux Documentation](https://www.mux.com)
- [Mux Go SDK](https://github.com/muxinc/mux-go)

## Related Tasks

- Follow-up: [Add owner_id to asset entity](../20260126184202_add_owner_id_to_asset_entity/README.md)
