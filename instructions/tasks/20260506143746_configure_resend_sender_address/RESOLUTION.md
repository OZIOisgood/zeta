# Resolution

## Summary
Configured outbound Resend email to use an explicit environment-provided sender address instead of the hard-coded Resend sandbox sender.

## Technical Details
- Added `RESEND_FROM_EMAIL` as a required backend runtime variable.
- Updated the email service to use the configured sender for all Resend `From` values.
- Added a focused unit test for email service sender configuration.
- Documented `RESEND_FROM_EMAIL` in `.env.example` and the root setup instructions.
- Added dev and prod Cloud Run deployment values:
  - Dev: `notifications@dev.zeta.m4xon.com`
  - Prod: `notifications@zeta.m4xon.com`
- Added Terraform locals and outputs for the environment-specific Resend sender addresses.

## Tests
- Added `internal/email/service_test.go` to verify `NewService` reads `RESEND_FROM_EMAIL`.
- No dashboard tests were required because the change does not touch the frontend.

## Verification
- [x] Ran `gofmt -w internal/email/service.go internal/email/service_test.go`.
- [x] Ran `terraform fmt infra/terraform/envs/dev/main.tf infra/terraform/envs/prod/main.tf`.
- [x] Ran `make api:build`.
- [x] Ran `make test:unit`.
- [x] Ran `terraform validate` in `infra/terraform/envs/dev`.
- [x] Ran `terraform validate` in `infra/terraform/envs/prod`.

## Next Steps
- Ensure `zeta.m4xon.com` is verified in Resend before the production deployment sends email from `notifications@zeta.m4xon.com`.
