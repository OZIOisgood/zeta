# Access And Invitation Flow Plan

## Context

The soft-launch backend and a basic `/welcome` page already exist on `main`: new users are waitlisted, expert signup codes and group invitation codes can activate them, experts lazily receive five codes, and admins can mint more. The intended product model is a controlled expert referral chain: existing experts may invite a limited number of other experts, so the team does not have to onboard every expert manually, while expert registration remains unavailable to the general public. The design handoff in `tmp/design_handoff_access_flow` is therefore a UX and lifecycle upgrade, not a greenfield feature.

Current gaps:

- the production welcome page does not implement the handoff's split layout, success state, focus behavior, help/legal links, or contextual group copy;
- a preserved `/groups?invite=...` deep link reaches `/welcome?code=...`, but the waitlisted user only sees a prefilled opaque code and is sent to `/` after redeem;
- direct email group invitations are not consistently restricted to the invited WorkOS email during accept/redeem;
- the expert-code list exposes only code/status, has no revoke action, and backend authorization is role-based instead of permission-based;
- the source and replenishment policy for expert codes is not explained to users;
- the new `tmp/logo.svg` mark has about 7-9% transparent outer padding and no generated size variants.

## Product Decisions

1. Keep one activation screen at `/welcome`, but make it invitation-aware.
   - Plain signup: show the waitlist view and reveal manual code entry on demand.
   - Group deep link: after WorkOS callback, validate the preserved code, show group name/avatar and explicit `Continue as student` copy, then redeem without asking the user to retype it.
   - Expert code deep link or manual entry: keep neutral code copy until redeem so the API does not become a code-type enumeration oracle.
2. Redeem remains explicit. Do not auto-join a group immediately after account creation; the confirmation step makes the resulting role and membership clear.
3. On success, show the handoff success view. Experts continue to `/`; students activated by a group invite continue directly to `/groups/{group_id}`.
4. Revoke invalidates only an available expert code. Consumed codes remain immutable history; revoking a code never removes an expert role already granted with it.
5. Treat the new mark as the canonical small logo. Crop the SVG viewBox to the visible rounded-square bounds, preserve its internal dark/cream/orange artwork, and generate the same SVG/PNG/WebP size family used by dashboard and landing.
6. Keep expert referrals bounded to five successful expert activations per inviter. The five codes are issued automatically when the expert opens the list; codes cannot be created or revoked manually.
7. Do not build global admin invite management in this iteration. Admin remains a testing role and uses the same personal invite-code surface as an expert.

## Implementation

### 1. WorkOS permissions and durable agent guidance

- Add constants in `internal/permissions/permissions.go`:
  - `access:invite-codes:read` - "View expert invite codes" - "View expert invitation codes and their redemption status."
- Using `WORKOS_API_KEY` from `.env`, call the WorkOS Authorization API to idempotently create the permissions, then add them without replacing unrelated role permissions:
  - `expert`: read;
  - `admin`: read.
- Verify the permission objects, descriptions, and role assignments with read-only API calls. Never print credentials.
- Update `AGENTS.md` and `.agents/skills/backend-api/SKILL.md`: every new/renamed permission must be added to code, created/updated through the WorkOS Authorization API using the environment credential, assigned to the intended roles, and verified. Warn against the destructive replace-all role endpoint unless the full role set is intentionally reconciled.
- Apply and verify these changes only in the current dev WorkOS environment selected by `.env`. Record production rollout as a future parity action once a production environment and credential exist.

### 2. Expert invitation lifecycle

- Count successful referrals separately from currently available codes and atomically create the missing personal codes when the list is requested.
- Replace role checks in `/access/codes` handlers with the new permissions.
- Evolve endpoints:
  - `GET /access/codes` returns only the caller's five codes plus `successful_referrals`, `referral_limit`, and `remaining_referrals`; each code includes `id`, `code`, `status`, and `consumed_at`.
- Keep code consumption atomic with `WHERE status = 'available'`; add structured audit-friendly log events without logging invite codes or email addresses.
- Replace the Preferences card list with a responsive list: status, used date, and copy action. Show a clear `N of 5 expert invitations used` allowance without create or revoke actions.
- Remove the current admin-only unlimited generation behavior and do not add cross-owner listing or a global admin UI.

### 3. Group deep-link activation

- Preserve the existing secure `return_to` cookie flow and `/groups?invite=CODE` URL. Do not put invitation state into WorkOS `state` beyond the existing opaque server-side state mechanism.
- Make an authenticated invitation-preview endpoint reachable to waitlisted users (prefer a narrow `/access/group-invitations/{code}` facade over moving all group invitation routes outside the active gate).
- Return only the context needed for confirmation: normalized code, group ID/name/avatar, joinability, and whether the current user is already a member. Use neutral not-found responses for invalid, revoked/consumed, or recipient-mismatched invitations.
- For email-specific invitations, require a case-insensitive match between the authenticated WorkOS email and invitation email in preview, normal accept, and access redeem. Generic link/QR invitations remain reusable.
- Refactor invitation acceptance/redeem into one transactional service path so membership creation, direct-invite consumption, access activation, and response data cannot drift. Make `user_groups` insertion idempotent and handle concurrent redemption safely.
- Return group context from successful student redeem:
  `role`, `access_status`, `role_upgraded`, and `group: { id, name, avatar }`.
- Preserve existing notifications/emails for a successful group join; ensure the access path does not silently skip behavior currently present in `AcceptInvitation`.

### 4. Welcome UX integration

- Rebuild `welcome-page.component.ts` from the handoff's visual/interaction spec while adapting it to the real API and existing wrappers.
- Use the new canonical mark and the existing Strido wordmark/product terminology. Keep the dark brand panel on desktop; on narrow screens collapse it to a compact branded header so code entry and error feedback stay above the fold.
- Implement distinct states: waitlist, group invitation preview loading/error/ready, manual code entry, redeem loading/error, and role-specific success.
- Upgrade `z-otp-input` to support the handoff requirements: grouped 4-4 visual treatment, completion/Enter events, `reselect()`, disabled state, correct live-message association, paste normalization, and reduced-motion-safe caret. Keep one semantic input with `autocomplete="one-time-code"`.
- Do not auto-submit on paste/full entry by default; enable it only if tests show it does not create surprising accidental activation. The primary button remains the clear confirmation.
- Use inline, non-enumerating errors; keep focus in the code field after rejection. Disable navigation/actions during redeem.
- Wire help to the real support address/link already used by the product, and legal links to landing Privacy/Imprint pages. Add EN/DE/FR Transloco copy with group and role interpolation.
- After redeem, reload `SessionStore`; retain the explicit success screen, then navigate to the role-appropriate destination when the user presses continue.

### 5. Brand mark replacement

- Normalize `tmp/logo.svg`: remove XML/DOCTYPE noise, crop the viewBox to the artwork bounds with a small intentional safe margin, and keep it as optimized vector source.
- Replace dashboard and landing `strido-mark.svg`, then regenerate `32`, `128`, `256`, `512`, and WebP variants with transparent backgrounds and high-quality downsampling. Update dashboard favicon assets as applicable.
- Do not replace the horizontal `strido-logo.*` wordmark files.
- Search every mark reference across dashboard, landing, email/README assets, and handoff-specific paths; update only surfaces intended to use the small mark.
- Visually compare SVG and every raster size on light/dark backgrounds, especially the 16/32px favicon rendering.

### 6. Documentation and records

- Update README access-gate and group-invitation flows with the final code origin, permissions, recipient validation, deep-link confirmation, revoke semantics, and destination behavior.
- Add a short completion report under `.agents/reports/` with migrations, WorkOS environment changes, files touched, verification, and any remaining environment rollout action.

## Tests And Verification

- Backend unit tests: permission gates, owner-only visibility, five-success referral limit, revoked-code replacement, concurrent create/redeem limits, create/revoke lifecycle, consumed-code protection, neutral errors, recipient email matching, reusable generic invites, idempotent membership, group context response, session refresh, and concurrency-sensitive SQL conditions.
- Integration tests: migration up/down where supported and a full waitlisted group-invite redeem transaction.
- Frontend tests: guards preserve invite context; invitation preview states; manual and deep-link entry; disabled/loading/error focus behavior; role-specific success/destination; table permission/action states; OTP normalization, paste, keyboard, and accessibility.
- Run `make db:sqlc`, focused Go/Angular tests, `make test:unit`, `make api:build`, `make web-next:lint`, `make web-next:test`, `make web-next:build`, and `make web-next:storybook:build` because a shared UI component changes.
- Run `git diff --check`; inspect rendered welcome states at desktop and mobile widths in the browser; verify keyboard-only navigation, focus order, reduced motion, and contrast.
- Re-read WorkOS permissions/roles through the Authorization API and confirm only intended additions occurred.

## Confirmed Scope

- Existing experts can invite other experts without staff involvement, but each inviter is limited to five successful expert activations.
- No global admin invitation table or separate admin dashboard is included. Admin uses the feature only as a test-capable account.
- WorkOS permission changes apply only to the current dev environment configured in `.env`; production parity is deferred until that environment exists.

## Verification Status

Implemented and verified on 2026-06-21. See `.agents/reports/20260621123953_access_invitation_flow_completion.md` for the final scope, WorkOS dev changes, and verification results.
