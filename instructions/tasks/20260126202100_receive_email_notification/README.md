# Task: receive email notification

## Status

- [ ] Defined
- [ ] In Progress
- [x] Completed

## Description

- As an group owner, I want to recieve email notification, when somebody from my group has uploaded the video (asset);
- As a developer I want Resend to be integrated for this purpose;
- For now it should not be pretty, just unstyled simple text in the email.
- README file should be updated.

## Context

- `instructions/CONSTITUTION.md` file updated to include `https://resend.com/docs/llms-full.txt` doc link.
- Use new `emails--receive` and `emails--new-asset-to-review` feature flags. (owner of the group should have two features to recieve an email).
- Note: The feature flag name `emails--receive:new-asset-in-group` was changed to `emails--new-asset-to-review` because WorkOS does not support colons in feature flag names.

## Acceptance Criteria

- [x] Resend is integrated into the backend.
- [x] Group owner receives an email when a member uploads a video.
- [x] Feature flags `emails--receive` and `emails--new-asset-to-review` are checked.
- [x] Project [README.md](../../../README.md) is updated.
