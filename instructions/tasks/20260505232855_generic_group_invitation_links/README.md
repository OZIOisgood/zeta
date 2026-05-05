# Task: Generic Group Invitation Links

## Status
- [x] Defined
- [x] In Progress
- [x] Completed

## Description
As an expert, I want to create an invitation link or QR code without specifying a recipient email address, so that the invitation can be printed, displayed, or shared in a group chat and used by multiple students.

## Permissions

No new permissions are required. Invitation creation continues to use `groups:invites:create`, enforced in `internal/invitations/handler.go`. QR code generation continues to require authenticated group membership for the target group.

## Context
- Current invitation creation requires an email address and sends an email for every invitation.
- The QR-code flow already supports sharing a generated link, but the backing invitation is currently tied to one email and becomes accepted after first use.
- Relevant files:
  - `internal/invitations/handler.go`
  - `db/queries/groups.sql`
  - `db/migrations/`
  - `web/dashboard/src/app/shared/components/invite-dialog/`
  - `web/dashboard/src/app/shared/services/invitations.service.ts`

## Test Assessment

Automated tests must be added or updated because the change affects server-side invitation validation and the reusable acceptance semantics for email-less invitations. Frontend coverage is lower priority for this narrow dialog change; build verification is required.

## Acceptance Criteria
- [x] Experts and administrators can create a group invitation without providing an email address.
- [x] Email-specific invitations continue to send email and remain single-use.
- [x] Email-less invitations do not send an email and remain reusable after users accept them.
- [x] QR code generation works for email-less invitations.
- [x] The invite dialog allows an optional valid email or no email.
- [x] The root README documents generic invitation links.
- [x] `make api:build` passes.
- [x] `make web:build` passes.
- [x] Relevant Go tests pass.
