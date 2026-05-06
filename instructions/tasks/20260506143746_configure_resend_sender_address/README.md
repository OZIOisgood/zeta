# Task: Configure Resend Sender Address

## Status
- [x] Defined
- [ ] In Progress
- [x] Completed

## Description
As a developer, I want outbound Resend email to use an explicit sender address from the configured environment so that deployed development email can send from the verified `dev.zeta.m4xon.com` domain instead of the Resend sandbox domain.

The API currently sends email with the hard-coded sender `onboarding@resend.dev`. This prevents normal delivery to arbitrary recipients and does not use the verified application domains.

## Permissions
No new permissions are required. This change affects backend infrastructure configuration and the internal email service only. It does not introduce a user-facing action or handler authorization change.

## Context
- `internal/email/service.go` defines the Resend sender request.
- `.env.example` documents local environment variables.
- `.github/workflows/deploy-dev.yml` and `.github/workflows/deploy-prod.yml` define Cloud Run runtime environment variables.
- `infra/terraform/envs/dev/main.tf` and `infra/terraform/envs/prod/main.tf` define environment-specific domains and outputs.
- Resend allows sending from any address on a verified domain; no mailbox registration is required for the sender address.

## Automated Test Assessment
The affected behavior is configuration loading, not a new user workflow. A focused unit test must verify that the email service reads `RESEND_FROM_EMAIL` from the environment and stores it as the sender used by outbound requests.

## Dashboard Loading State Assessment
This task does not touch the Angular dashboard and does not introduce asynchronous content loading states.

## Acceptance Criteria
- [x] The email sender address is read from `RESEND_FROM_EMAIL`.
- [x] Local environment documentation includes `RESEND_FROM_EMAIL`.
- [x] The dev deployment sets `RESEND_FROM_EMAIL=notifications@dev.zeta.m4xon.com`.
- [x] The prod deployment sets an environment-specific sender address for the production domain.
- [x] Terraform environment outputs document the expected sender address per environment.
- [x] Backend build and unit tests pass.
