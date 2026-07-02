# Access Invitation Flow Completion

## Context

Implemented the first-login access handoff as a complete waitlist, expert referral, and group deep-link flow. Existing experts can invite trusted experts without staff involvement while each inviter remains limited to five successful referrals.

## Decisions

- Five consumed expert codes is the lifetime referral limit per inviter. Five codes are issued automatically and cannot be manually created or revoked.
- Expert recommendation codes also upgrade an already-active student through the WorkOS organization membership API; active experts and admins never consume another code.
- Expert/admin code access is permission-based; no global admin invitation table was added.
- Email-specific group invites require the authenticated WorkOS email to match. Generic link/QR invites stay reusable.
- WorkOS changes were applied only to the dev environment selected by `.env`.

## Changed Areas

- Added atomic quota-aware expert code provisioning, group invitation listing/revocation, idempotent group membership insertion, sqlc output, and mocks.
- Added waitlisted group invitation preview, group context in redeem responses, recipient checks, and direct group navigation after activation.
- Rebuilt `/welcome`, upgraded the shared OTP input, localized EN/DE/FR copy, and added responsive expert and group invitation histories.
- Added a student-only Preferences > Become an expert redemption flow and aligned the group invitation table into fixed Code/Recipient/Status/Actions columns.
- Replaced dashboard/landing small marks and generated SVG, PNG 32/128/256/512, WebP, and dashboard favicon variants.
- Kept `access:invite-codes:read` for expert code visibility. Added `groups:invites:read/revoke` to WorkOS dev and assigned them to `expert` and `admin`; removed obsolete expert-code create/revoke assignments.
- Updated README, `AGENTS.md`, backend skill guidance, tests, and a Welcome Storybook story.

## Verification

- `make db:sqlc`
- `make test:unit` (all Go packages passed)
- `make api:build`
- frontend Prettier check
- Angular tests: 42 files, 142 tests passed
- Angular production build passed; existing bundle/CommonJS warnings remain
- Storybook build passed; existing asset-size warnings remain
- Desktop 1440x900 and mobile 390x844 Welcome/OTP states visually inspected in Storybook
- Group invitation table visually inspected in Storybook at 1280px and 390px
- New 32px and 512px marks visually inspected
- WorkOS permission metadata and expert/admin assignments re-read successfully through the Authorization API
- Local migrations applied through `20260621183000`; signup-code revocation schema was removed and group invitations gained revocation history
- `git diff --check`

## Follow-up

- Apply the same WorkOS permissions when a production WorkOS environment is created.
