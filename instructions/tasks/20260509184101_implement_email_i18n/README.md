# Task: implement email i18n

## Status

- [x] Defined
- [x] In Progress
- [x] Completed

## Description

As a Zeta user, I want to receive transactional emails (invitations, coaching bookings, video updates, group membership changes) in the language I have configured in my profile, so that the platform feels native to me regardless of which language I speak.

## Context

- User language preference is stored in `user_preferences.language` as a `LanguageCode` enum with values `en`, `de`, `fr`.
- Email delivery infrastructure was added in the preceding task `20260508222853_implement_email_templating`. All notifications now go through `email.SendTemplate` with an `email.Message` struct.
- External invitation recipients (people not yet registered in Zeta) have no stored preference — their emails default to `DEFAULT_LANGUAGE` env var.
- `DEFAULT_LANGUAGE=en` is already set in `.env.example` and both deploy workflows.
- Relevant files before this task: `internal/email/renderer.go`, `internal/coaching/booking_email.go`, `internal/coaching/reminder.go`, `internal/invitations/handler.go`, `internal/users/handler.go`, `internal/assets/handler.go`, `cmd/email-preview/main.go`.

## Acceptance Criteria

- [x] A `internal/i18n` package provides a thread-safe go-i18n v2 bundle with `For(lang)`, `Default()`, `DefaultLang()`, and `T(loc, key, data...)` helpers.
- [x] Locale JSON files exist for English, German, and French covering all email copy (subject, preheader, title, intro, button, footer, and all detail labels).
- [x] `email.Message` is redesigned with a `Copy` struct so HTML templates render pre-translated strings with no i18n logic inside templates.
- [x] `preferences.UserLang(ctx, q, log, userID)` fetches the user's language preference and falls back to `DEFAULT_LANGUAGE`.
- [x] All seven notification call sites (booking confirmed, booking cancelled, reminder, invitation, invitation accepted, member removed, video uploaded, video reviewed) use per-recipient localizers.
- [x] Reminder emails are sent individually per recipient so each can receive their own language.
- [x] External invitation emails fall back to `DEFAULT_LANGUAGE` with a documented rationale.
- [x] `cmd/email-preview` and all existing tests are updated to the new struct shape.
- [x] API build and unit tests pass.
