# Infrastructure Configuration Ownership

## Context

The Strido domain rollout added workflow constants for production dashboard/API URLs and the Resend sender address. The question was whether those values also needed Google Secret Manager, and how future env/infrastructure changes should be handled consistently.

## Decision

- `PROD_DASHBOARD_URL`, `PROD_API_URL`, and `PROD_RESEND_FROM_EMAIL` are public deploy/runtime configuration. They remain versioned in the prod workflow and reach Cloud Run through `--set-env-vars`; no Secret Manager objects are needed.
- Secret Manager remains the source for credentials, passwords, signing material, and private connection strings bound through `--set-secrets`.
- Terraform owns infrastructure shape and secrets it generates. Third-party credential payloads remain securely provisioned in Secret Manager unless deliberately migrated.
- Workflow-level `env:` is GitHub Actions scope only; it is not automatically Cloud Run configuration or Secret Manager.

## Research

- Live Secret Manager inventory contained application credentials and generated secrets, but no Strido URL or sender-address secrets.
- Redacted `zeta-api-dev` Cloud Run configuration showed URLs, sender address, flags, and tuning as literal env values; credentials and connection strings used `secretKeyRef`.
- Git history and existing docs show previous `gcloud secrets create` work was for credential payloads, not ordinary public configuration.
- GitHub `dev`/`prod` environments still contain legacy `CLOUD_RUN_*` URL variables. Current workflows do not reference them; they are obsolete external state and were not deleted in this repository-only change.

## Files

- Added `.agents/skills/infra-configuration/` with ownership rules, recipes, and an audit helper.
- Added Codex and Claude `infra-reviewer` agents.
- Updated `AGENTS.md`, backend skill/agents, and `docs/cicd.md` to use the shared ownership model.

## Verification

- Ran the audit helper against plain and secret-bound examples and across `.env.example`.
- `quick_validate.py` accepted the new skill.
- Shell syntax and macOS Bash compatibility passed; the helper is executable.
- Changed workflows/OpenAI metadata parsed as YAML; Codex agent files parsed as TOML.
- `terraform fmt -check -recursive infra/terraform` passed.
- `terraform validate` passed for both dev and prod.
- `git diff --check` passed.

## Follow-up

- Remove the unused legacy GitHub Environment `CLOUD_RUN_*` variables after an operator confirms no out-of-repository consumer depends on them.
