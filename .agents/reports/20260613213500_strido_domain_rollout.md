# Strido Domain Rollout

## Context

Move Zeta from the legacy `zeta.m4xon.com` domains to the Strido domain layout and publish a temporary landing page.

## Decision And Scope

- `strido.net` serves a static nginx landing page from `zeta-landing`.
- Dev uses dedicated `zeta-dashboard-dev` and `zeta-api-dev` services mapped to `app.dev.strido.net` and `api.dev.strido.net`.
- Prod is configured for dedicated `zeta-dashboard-prod` and `zeta-api-prod` services mapped to `app.strido.net` and `api.strido.net`.
- Legacy shared Cloud Run services are forgotten from the new Terraform configuration with `destroy = false`; they remain online until migration cleanup.
- Prod app/API were not provisioned because `zeta-prod` Cloud SQL and required production secrets do not yet exist.

## Files And Areas

- `web/landing/`
- `infra/terraform/envs/dev/main.tf`
- `infra/terraform/envs/prod/main.tf`
- `.github/workflows/deploy-dev.yml`
- `.github/workflows/deploy-prod.yml`
- `.github/workflows/ci.yml`
- `.env.example`, email fallback config/tests, and `README.md`

## Applied Infrastructure

- Created and deployed `zeta-landing`; `https://strido.net` returns the landing page and `/health` returns 200.
- Created and deployed `zeta-dashboard-dev` and `zeta-api-dev` with the existing `latest` images.
- Created mappings for `app.dev.strido.net` and `api.dev.strido.net`; Google certificate provisioning was still pending at completion time.
- Updated dev schedulers to target `zeta-api-dev`.
- Enabled the Cloud Build API, although the active user lacks Cloud Build submit permission; the landing image was built and pushed with local Docker instead.

## Verification

- Landing checked at desktop and mobile widths with no horizontal overflow.
- Live `strido.net`, Cloud Run landing URL, and `/health` return 200.
- Direct dev API `/health` returns 200.
- Dev dashboard runtime config points to `https://api.dev.strido.net`.
- CORS preflight allows `https://app.dev.strido.net` with credentials.
- `go test ./internal/email`, Terraform formatting, YAML parsing, and `git diff --check` passed.

## Follow-Ups

- Add `https://api.dev.strido.net/auth/callback` and `https://api.strido.net/auth/callback` in WorkOS.
- Wait for Google-managed certificates on the two dev subdomains.
- Provision/import prod Cloud SQL, required `zeta-prod-*` secrets, recording storage, and related IAM before applying the full prod Terraform plan.
- After prod domains are verified, remove the legacy `zeta-api` and `zeta-dashboard` services.
