---
name: infra-configuration
description: Manage Zeta infrastructure and runtime configuration across application env reads, .env.example, GitHub Actions variables/secrets, Google Secret Manager, Cloud Run bindings, Terraform, DNS, IAM, and external provider dashboards. Use when adding, changing, rotating, reclassifying, or removing environment variables, secrets, service/domain configuration, cloud resources, deployment settings, or provider callbacks.
---

# Infra Configuration

Treat configuration as an ownership problem. Classify each value before editing, update every owned surface, inspect live state before applying, and verify the deployed binding without exposing secret payloads.

Read [references/config-ownership.md](references/config-ownership.md) for the current ownership matrix and add/update/remove recipes.

## Workflow

1. Inspect `README.md`, `docs/cicd.md`, `.env.example`, both deploy workflows, nearby Terraform, application env reads, and the current git diff.
2. Run `scripts/audit_runtime_config.sh VAR_NAME...` for affected runtime variables.
3. Classify every value:
   - **Secret payload**: credentials, API keys, passwords, signing material, private connection strings. Store in Google Secret Manager and bind with `--set-secrets`.
   - **Generated infrastructure secret**: DB URLs, generated passwords, HMAC secret keys. Terraform may own the secret and version when it generated the value.
   - **Plain runtime config**: public URLs, sender addresses, feature flags, tuning values, bucket names. Bind with `--set-env-vars`.
   - **CI/deploy config**: project IDs, image paths, regions, tool versions. Keep in GitHub Environment Variables or workflow `env`, depending on whether operators or code review should own changes.
   - **Infrastructure shape**: services, domains, IAM, databases, storage, schedulers. Manage with Terraform.
4. Choose exactly one source of truth for each value. Do not mirror a plain value into Secret Manager “for consistency”.
5. Update all parity surfaces that apply: application reads/tests, `.env.example`, dev/prod workflows, Terraform, external provider dashboards, docs, and task records.
6. Inspect existing GCP/GitHub/Terraform state before creating, importing, rotating, replacing, or deleting anything.
7. Plan before apply. Treat unexpected replacement, deletion, or unrelated resource creation as a blocker to applying that plan.
8. Verify the live Cloud Run binding by names and source type; redact values and never print secret payloads.

## Source Rules

- Workflow-level `env:` values exist only inside GitHub Actions. They become Cloud Run runtime variables only when passed through `gcloud run deploy --set-env-vars`.
- Browser-visible values such as dashboard `API_URL` can never be secrets.
- Secret Manager is for confidentiality, rotation, access control, and auditability, not for ordinary environment-specific constants.
- Keep third-party secret payloads out of Terraform state. Create/rotate their Secret Manager versions through a secure manual or dedicated provisioning path; Terraform may manage the container/IAM if deliberately adopted.
- Never manually mutate a Terraform-owned secret/resource with `gcloud` without an import/state reconciliation plan.
- Existing non-secret IDs stored as secrets may remain until a deliberate migration; do not expand that pattern automatically.

## Secret Operations

- Check existence with `gcloud secrets describe`, never by reading the value.
- Create or rotate using stdin/file input so payloads do not appear in shell history or process arguments.
- Use `zeta-{env}-{kebab-name}` and bind the application variable explicitly in both relevant workflows.
- When reclassifying secret to plain config, remove the old secret binding before/with the deploy. Delete the Secret Manager object only after no active service/revision needs it and ownership is confirmed.
- When removing a secret, remove application usage and deployment binding first. If Terraform owns it, remove it through Terraform plan/apply; otherwise follow the retention/destruction decision explicitly.

## Required Verification

- `git diff --check`
- YAML parse for changed workflows
- `terraform fmt -check` and `terraform validate`; run a real plan for stateful changes
- Relevant build/tests
- Redacted `gcloud run services describe` showing literal values versus `secretKeyRef` names
- `gcloud secrets list` or `describe` by name only when secrets changed
- External provider callback/domain verification when URLs changed

Do not claim completion when a workflow references a missing secret, a secret exists without a runtime binding, dev/prod parity is unexplained, or live state was not checked for an applied infrastructure change.
