# Custom WorkOS authentication

## Context

Replace hosted AuthKit screens with Strido-owned Angular pages matching the
existing `/welcome` invitation-code experience. Initial product scope is
email/password registration and sign-in, Google authentication, email
verification, and password recovery. First name, last name, and display name
are required. Existing users need no remediation.

## Architecture decision

- Keep WorkOS as the identity and session authority, using its headless User
  Management/AuthKit APIs through the Go API only. Angular must never receive
  the WorkOS API key, refresh token, pending authentication token, MFA secret,
  or provider tokens.
- Use `workos-go` for user creation, password authentication, verification,
  reset, Google authorization/code exchange, refresh, logout, and typed
  continuation errors. Upgrade the pinned v4 SDK to the current compatible v9
  before implementation and extend the local interface/mocks.
- Google remains a redirect flow: the Go API generates an authorization URL
  with `provider=GoogleOAuth`; Google/WorkOS authenticate the user; the existing
  API callback validates state and exchanges the code.
- WorkOS owns password hashing/policy, breached-password checks, verification
  and reset tokens/emails, Google protocol details, identity linking, and token
  issuance. Zeta owns forms, validation, safe error mapping, rate limiting,
  continuation state, profile completion, and HttpOnly session cookies.
- Do not use WorkOS Actions for field validation initially. They are signed
  allow/deny hooks, not Keycloak-style field validators, and add an external
  callback/secret without improving validation of Zeta's own API endpoint.
- Keep Zeta `user_preferences.display_name` as the product source of truth.
  WorkOS Branding “Display name” is the application name, not a user field.

## Product decisions

- Use one registration form rather than separate name steps; the fields are
  short and a multi-step flow adds continuation and accessibility complexity.
- `display_name` starts empty and auto-fills while pristine:
  - first name only -> first name;
  - first and last name -> the existing privacy default `First L.`;
  - after the first direct edit of display name, name-field edits never
    overwrite it again. Clearing a manually edited value leaves it invalid
    rather than restarting auto-fill.
- The Go API trims and requires first name, last name, and display name. The
  Preferences API receives the same invariant and may no longer clear them.
- A first-time Google user always sees `/complete-profile`, prefilled from the
  provider, to confirm required names and choose a display name. Existing
  Google users with local preferences skip this step.
- MFA is not part of the first delivery. Design the continuation model so TOTP
  enrollment/challenge can be added later. WorkOS supplies MFA factors,
  challenges, QR/secret data, and validation, but Zeta must build the UI.
- Passkeys are excluded: WorkOS currently supports passkey authentication only
  through hosted AuthKit. Adding them later requires a hybrid hosted route or a
  new architecture decision.

## Implementation plan

### 1. WorkOS adapter and common authentication state

- Upgrade `github.com/workos/workos-go` from v4 to the current compatible v9;
  inspect migration notes and update imports/API shapes.
- Expand `internal/auth/workos.go` and regenerate its mock for Create User,
  password auth, verification/resend, password reset, Google code exchange,
  and the continuation APIs needed by typed WorkOS errors.
- Refactor the callback's organization membership, organization-scoped refresh,
  cookie issuance, logging, and redirect logic into one finalizer shared by
  password verification and Google.
- Introduce a server-controlled auth-flow/continuation state. Store only an
  opaque identifier in a Secure, HttpOnly cookie; retain validated relative
  `return_to` and sensitive pending tokens in an expiring PostgreSQL auth-flow
  record so continuation works across Cloud Run instances. Consume transitions
  once and clean up expired records. Do not use localStorage or expose provider
  tokens.
- Define stable flow outcomes for `authenticated`, `verify_email`,
  `complete_profile`, and controlled unsupported states. Reserve extensible
  outcomes for future `mfa_enrollment`, `mfa_challenge`, Radar challenge, and
  organization selection.

### 2. Public backend endpoints

- Add JSON endpoints for sign-up, sign-in, email-code verification/resend,
  forgot/reset password, and profile completion.
- Retain `/auth/callback` for Google and change `/auth/login` into an explicit
  provider launcher or add `/auth/oauth/google`.
- On password sign-up: validate names/display name, call WorkOS Create User,
  create/upsert local preferences, then authenticate so required email
  verification enters the normal continuation flow.
- On sign-in: pass trusted client IP and User-Agent to WorkOS, map invalid
  credentials without leaking account existence, and complete or continue the
  flow based on typed WorkOS responses.
- Let WorkOS send verification and password-reset emails initially. The reset
  route captures WorkOS's one-time `token`; successful reset revokes existing
  sessions per WorkOS behavior and returns to sign-in.
- Make forgot-password responses identical for known and unknown addresses.
- Add request-size limits, endpoint-specific throttling, Origin/CSRF review,
  stable structured events, and redaction of email/password/code/token data.
- Make profile creation idempotent so a WorkOS-success/local-write-failure can
  recover through `/complete-profile` instead of stranding the account.

### 3. Profile completeness and database rules

- Stop `/auth/me` from silently manufacturing preferences for a newly
  authenticated social user. Return an authenticated response with
  `profile_complete=false` when no local profile exists.
- Add a profile-completion guard before the access/waitlist guard. The profile
  endpoint upserts required first name, last name, display name, locale, and
  timezone, then resumes the preserved destination.
- Add idempotent sqlc profile initialization/upsert queries and consider
  nonblank trimmed database checks for the three required name fields. No
  legacy backfill is planned because the product owner confirmed there are no
  existing nameless users.
- Reject blank first/last/display names in `PUT /auth/me` and mirror the
  required validation in Preferences.

### 4. Angular pages and shared layout

- Extract the branded split shell from `WelcomePageComponent` so `/welcome`,
  sign-in, sign-up, verification, recovery, reset, and profile completion share
  one responsive layout.
- Add public routes before the protected shell: `/sign-in`, `/sign-up`,
  `/verify-email`, `/forgot-password`, `/reset-password`, and
  `/complete-profile`. Replace/remove the currently unused hosted-login page.
- Reuse `z-text-input`, `z-field-label`, `z-field-error`, `z-button`,
  `z-checkbox`, and `z-otp-input`; add no new primitive unless a real gap is
  found.
- Sign-in contains email/password, Google, recovery, and sign-up actions.
- Sign-up contains first name, last name, display name, email, password,
  password-policy feedback, and legal links. Implement auto-fill-until-directly-
  edited as form logic with explicit tests.
- Add verification/resend, non-enumerating recovery confirmation, reset token
  error/success, Google callback error, and profile-completion states.
- Add all user-facing copy to DE/EN/FR Transloco files with password-manager
  autocomplete, keyboard submission, focus/error behavior, disabled submitting
  controls, and narrow-screen coverage.

### 5. Redirect and invitation preservation

- Change guards to route unauthenticated users internally to
  `/sign-in?return_to=<exact relative URL>` rather than immediately launching
  hosted AuthKit.
- Validate `return_to` on the server with the existing same-site rules and
  preserve it through sign-in, sign-up, verification, Google OAuth, recovery,
  reset, and profile completion.
- Preserve `/groups?invite=CODE` unchanged until authentication finishes:
  active users reach the invitation dialog; waitlisted users continue through
  `/welcome?code=CODE`; direct-email matching remains enforced by the API.
- Cover live-call URLs and ordinary video/group/session/preferences deep links
  through the same generic continuation contract.
- Use short OAuth state expiry for Google and a longer bounded continuation for
  email verification/reset. If a reset email opens without its original browser
  continuation, safely fall back to `/sign-in` rather than accepting an
  untrusted return URL.

### 6. Deferred provider/configuration work

Do not change these until implementation is approved and ready for staged
verification:

- WorkOS Google provider enablement/credentials.
- WorkOS allowed callback and password-reset URLs for local, dev, and prod.
- Email verification and password policy settings.
- Confirmation that headless Radar preview is available before promising Radar
  behavior.
- Dev/prod Cloud Run bindings and documentation parity. The minimal design is
  expected to reuse `WORKOS_API_KEY`, `WORKOS_CLIENT_ID`,
  `WORKOS_REDIRECT_URI`, `DEFAULT_ORG_ID`, and `FRONTEND_URL`; any new value must
  be classified and propagated through `.env.example`, both deploy workflows,
  provider settings, and docs.

## Verification

- Backend table tests: validation, safe duplicate/credential errors,
  verification/resend, reset expiry/success, Google state and callback errors,
  identity linking/first social login, organization scoping, cookie issuance,
  flow expiry/replay, open redirects, and sensitive-log redaction.
- Frontend tests: every form state, display-name pristine/customized behavior,
  auth/profile/access guard ordering, exact query preservation, and all auth
  transitions.
- End-to-end cases: password registration; Google registration; returning
  sign-in; recovery; `/groups?invite=CODE` for new waitlisted and active users;
  email-specific wrong-account handling; live-session deep link.
- Run focused tests, then `make test:unit`, `make api:build`,
  `make web-next:lint`, `make web-next:test`, `make web-next:build`, and
  `make web-next:storybook:build` when the shared shell changes.
- Update README auth/invitation flows after implementation.

## References

- WorkOS custom authentication and errors:
  https://workos.com/docs/reference/authkit/authentication-errors
- Google/social authorization:
  https://workos.com/docs/reference/authkit/authentication/get-authorization-url
- Email/password and password policy:
  https://workos.com/docs/authkit/email-password
- MFA API boundary:
  https://workos.com/docs/authkit/mfa
- Passkey hosted-only limitation:
  https://workos.com/docs/authkit/passkeys/passkey-configuration/multi-factor-auth
- Actions:
  https://workos.com/docs/authkit/actions
