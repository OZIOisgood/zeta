# Task: Refactor User Preferences Schema

## Status

- [ ] Defined
- [ ] In Progress
- [x] Completed

## Description

Refactor the local database to remove the `users` profile table (names, emails, avatars) which is redundant with WorkOS. Introduce a `user_preferences` table to store application-specific settings like `language`.

## Context

- We are using WorkOS as the Identity Provider.
- We previously stored a copy of the user profile locally.
- We want to store language preferences locally.

## Acceptance Criteria

- [x] `users` table removed or replaced.
- [x] `user_preferences` table created with `language` (ENUM: en, de, fr).
- [x] Backend logic updated to fetch/update preferences.
- [x] `README.md` updated.
- [x] Frontend verified (already supports en, de, fr).
