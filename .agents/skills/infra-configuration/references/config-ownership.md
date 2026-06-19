# Zeta Configuration Ownership

## Ownership Matrix

| Value class | Examples | Source of truth | Runtime delivery |
| --- | --- | --- | --- |
| Secret payload | API keys, passwords, signing certificates, scheduler bearer secret | Google Secret Manager | Cloud Run `--set-secrets` |
| Terraform-generated secret | `DB_URL`, generated DB password, Agora HMAC keys | Terraform resource + protected state | Secret Manager + `--set-secrets` |
| Plain runtime config | `FRONTEND_URL`, `ALLOWED_ORIGINS`, `WORKOS_REDIRECT_URI`, sender email, flags, limits, bucket name | Versioned deploy workflow unless operator-owned | Cloud Run `--set-env-vars` |
| Browser runtime config | Dashboard `API_URL` | Versioned deploy workflow | Dashboard Cloud Run env writes public `env.js` |
| CI/deploy config | `GCP_PROJECT_ID`, region, image paths, tool versions | GitHub Environment Variable or workflow `env` | GitHub Actions only |
| Infrastructure shape | Cloud Run services, domain mappings, Cloud SQL, storage, IAM, schedulers | Terraform | Provider resources |
| External provider config | WorkOS callback URLs, Resend domain verification, DNS records | Provider dashboard/registrar, documented in repo | External control plane |
| Local development contract | Every supported application env var with safe placeholder | `.env.example` | Developer `.env` |

Workflow `env:` is not Google Secret Manager and is not automatically a Cloud Run environment. It is scoped to the GitHub job. A value reaches the application only through a deploy flag such as `--set-env-vars`, `--set-secrets`, or container-specific runtime injection.

## Current Zeta Pattern

- Deploy workflows own Cloud Run runtime bindings because Terraform intentionally ignores container configuration changed by `gcloud run deploy`.
- Terraform owns services, scaling, public IAM, domains, databases, storage, schedulers, generated secrets, and deploy IAM.
- Third-party credential payloads are manually provisioned in Secret Manager and referenced by name in deploy workflows.
- `DB_URL` and Agora recording HMAC credentials are generated and versioned by Terraform.
- GitHub environment secrets hold WIF/deploy identity plumbing. `GCP_PROJECT_ID` is a GitHub environment variable.
- Public Strido URLs and sender addresses are versioned workflow constants. They do not need Secret Manager.

Some identifiers such as `WORKOS_CLIENT_ID`, `DEFAULT_ORG_ID`, `MUX_TOKEN_ID`, and `AGORA_APP_ID` are currently secret-bound even though identifiers alone may not grant access. Preserve the existing binding unless a task explicitly migrates them; classify new values by disclosure impact instead of copying historical storage choices.

## Add A Variable

1. Find all application reads and decide whether the variable is required, optional, local-only, server-only, or browser-visible.
2. Classify the value using the ownership matrix.
3. Add a safe placeholder and explanatory comment to `.env.example`.
4. Add dev and prod runtime bindings, or document why one environment intentionally differs.
5. For a secret:
   - choose `zeta-{env}-{kebab-name}`;
   - check whether Terraform or manual provisioning owns the payload;
   - create the secret/version without exposing the value;
   - ensure the runtime service account has least-privilege access;
   - bind with `--set-secrets="ENV_VAR=secret-name:latest"`.
6. For plain runtime config, bind with `--set-env-vars`; keep stable reviewable values in the workflow and operator-controlled values in GitHub Environment Variables.
7. Update Terraform only when infrastructure, IAM, generated values, or Terraform outputs depend on the variable.
8. Update provider dashboards and DNS when callback/origin/domain behavior changes.
9. Add tests for parsing, fallback, required-value failure, or behavior affected by the config.

## Update Or Rotate

- Plain config: change its source of truth, keep dev/prod and docs aligned, deploy, and verify the literal Cloud Run value.
- Manual secret: add a new Secret Manager version, deploy or restart as needed, verify binding/version, then disable stale versions according to retention policy.
- Terraform-generated secret: change the generating resource/config, inspect the plan for replacement and downstream effects, then apply. Never manually add a competing version and assume Terraform remains authoritative.
- URL/domain: update domain mapping/DNS, CORS, frontend URL, API URL, WorkOS callbacks/logout return URLs, email links/logo, and tests. Order changes so the provider accepts the new callback before application traffic switches.

## Remove Or Reclassify

1. Remove application reads and fallback behavior.
2. Remove the variable from `.env.example`, tests, docs, dev/prod workflows, and dashboard runtime injection.
3. Remove Cloud Run binding explicitly. Reclassification from `--set-secrets` to `--set-env-vars` may require `gcloud run services update --remove-secrets=ENV_VAR` before deployment.
4. Verify no active service uses the secret name. Consider retained old revisions before deleting a secret object.
5. If Terraform owns the secret/resource, remove it through reviewed plan/apply. If manually owned, delete/disable only after an explicit retention decision.
6. Remove obsolete GitHub variables/secrets and provider configuration after all consumers migrate.

## Safe Inspection Commands

```bash
# Names and metadata only; do not access payloads during an inventory.
gcloud secrets list --project="$PROJECT_ID" --format='value(name)'
gcloud secrets describe SECRET --project="$PROJECT_ID"

# Redact literals while preserving env and secret binding names.
gcloud run services describe SERVICE --region="$REGION" --project="$PROJECT_ID" \
  --format='yaml(spec.template.spec.containers[0].env)'

gh variable list --env dev
gh variable list --env prod
gh secret list --env dev
gh secret list --env prod
```

Do not use `gcloud secrets versions access` merely to compare configuration. Access payloads only when the requested operation requires the value and handle output as sensitive.
