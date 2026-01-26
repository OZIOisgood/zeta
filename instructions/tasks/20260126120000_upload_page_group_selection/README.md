# Group Selection on Upload Page

## Context

As a user with `upload-video` feature I go to the `upload-video` page. I expect to see there a select input to select a group to send asset for a review to.

## Requirements

- [x] Add `group_id` column to `assets` table.
- [x] Update `CreateAsset` endpoint to accept `group_id`.
- [x] Implement `tui-select` (or custom textfield) on Upload Page for group selection.
- [x] Groups should be filtered to only those the user belongs to.
- [x] Selected group should be saved with the asset.

## Implementation Plan

- [x] Database Migration
- [x] Backend API Updates
- [x] Frontend Service Updates
- [x] Frontend Component Updates

## Follow-up

- [20260126185950_rename_upload_video_feature_to_create_asset](../20260126185950_rename_upload_video_feature_to_create_asset/README.md)
