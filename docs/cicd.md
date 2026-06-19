# CI/CD and Infrastructure

This document describes Zeta deployment, infrastructure ownership, and runtime configuration. For operational add/update/remove recipes, use `.agents/skills/infra-configuration/SKILL.md`.

## Environments

| Environment | Trigger | API | Dashboard | Landing |
| --- | --- | --- | --- | --- |
| `local` | Developer command | Docker Compose | Local Angular | Local files/container |
| `dev` | Push to `main` | `zeta-api-dev` | `zeta-dashboard-dev` | Not deployed |
| `prod` | `v*` tag for API/dashboard; landing change on `main` | `zeta-api-prod` | `zeta-dashboard-prod` | `zeta-landing` |

Public domains:

| Domain | Target |
| --- | --- |
| `strido.net` | Production landing |
| `app.strido.net` | Production dashboard |
| `api.strido.net` | Production API |
| `app.dev.strido.net` | Development dashboard |
| `api.dev.strido.net` | Development API |
| `strido.de` | Registrar-managed redirect to `strido.net` |

Cloud Run domain mappings are Terraform-managed. DNS records live at the registrar. Resend verification records are separate from Cloud Run records and must remain present.

## Workflows

| Workflow | Trigger | Purpose |
| --- | --- | --- |
| `.github/workflows/ci.yml` | Pull request to `main` | Build/test API and dashboard; build landing image |
| `.github/workflows/deploy-dev.yml` | Push to `main` | Migrate and deploy dev API/dashboard |
| `.github/workflows/deploy-prod.yml` | Push of `v*` tag | Migrate and deploy prod API/dashboard |
| `.github/workflows/deploy-landing.yml` | Landing change on `main`, or manual | Build and deploy production landing only |
| `.github/workflows/infra.yml` | Manual | Terraform plan or apply for dev/prod |

All workflows authenticate through Workload Identity Federation. GitHub stores no long-lived GCP service-account JSON key.

## Configuration Ownership

Classify a value before deciding where to put it:

| Value | Source of truth | Cloud Run delivery |
| --- | --- | --- |
| Credentials, passwords, signing material, private connection strings | Google Secret Manager | `--set-secrets` |
| Terraform-generated secrets such as `DB_URL` and Agora HMAC keys | Terraform plus protected state | Secret Manager, then `--set-secrets` |
| Public URLs, sender addresses, origins, flags, limits, bucket names | Versioned workflow or GitHub Environment Variable | `--set-env-vars` |
| Project ID, region, image names, tool versions | GitHub Environment Variable or workflow `env` | Workflow only |
| Services, IAM, domains, SQL, storage, schedulers | Terraform | GCP resources |

Workflow-level `env:` does not create a Secret Manager secret and does not automatically configure Cloud Run. It is GitHub Actions configuration. A value becomes runtime configuration only when a deploy step passes it through `--set-env-vars`, `--set-secrets`, or another explicit injection mechanism.

The Strido URLs and `notifications@strido.net` are intentionally plain workflow constants. They are public operational configuration, not secrets:

```yaml
env:
  PROD_DASHBOARD_URL: https://app.strido.net
  PROD_API_URL: https://api.strido.net
  PROD_RESEND_FROM_EMAIL: notifications@strido.net
```

The API deploy maps these constants to `ALLOWED_ORIGINS`, `FRONTEND_URL`, `WORKOS_REDIRECT_URI`, and `RESEND_FROM_EMAIL`. The dashboard deploy maps the API URL to browser-visible `API_URL`.

## GitHub Environments

Create `dev` and `prod` GitHub Environments. Production should require reviewer approval.

Secrets per environment:

| Name | Purpose |
| --- | --- |
| `GCP_WIF_PROVIDER` | Workload Identity provider resource name |
| `GCP_SERVICE_ACCOUNT` | Deployment service-account email |

Variables per environment:

| Name | Purpose |
| --- | --- |
| `GCP_PROJECT_ID` | GCP project used by workflows |

Legacy `CLOUD_RUN_*_URL` GitHub variables are not consumed by the current workflows and should not be used as a second source of truth.

## Secret Manager

Secret names follow `zeta-{env}-{kebab-name}` and are bound explicitly to application env names.

Examples:

| Secret | App env | Owner |
| --- | --- | --- |
| `zeta-dev-db-url` | `DB_URL` | Terraform cloud-sql module |
| `zeta-prod-agora-recording-hmac-access-key` | Terraform output/use | Terraform storage module |
| `zeta-dev-workos-api-key` | `WORKOS_API_KEY` | Manual secure provisioning |
| `zeta-prod-resend-api-key` | `RESEND_API_KEY` | Manual secure provisioning |
| `zeta-dev-scheduler-secret` | `SCHEDULER_SECRET` and scheduler header | Manual secret; consumed by deploy and Terraform workflow |
| `zeta-dev-discord-bot-token` | `DISCORD_BOT_TOKEN` | Manual secret for feedback forum posting |
| `zeta-prod-discord-bot-token` | `DISCORD_BOT_TOKEN` | Manual secret for feedback forum posting |

Check for a secret without reading its payload:

```bash
gcloud secrets describe zeta-dev-workos-api-key --project="$PROJECT_ID"
```

Create or rotate payloads through stdin/file input so the value is not an argument:

```bash
printf '%s' "$WORKOS_API_KEY" | gcloud secrets versions add zeta-dev-workos-api-key \
  --data-file=- --project="$PROJECT_ID"
```

Do not put public URLs, sender email addresses, flags, or limits in Secret Manager merely for consistency. Do not access secret payloads for routine inventory.

Discord feedback forum IDs, application ID, and public key are plain runtime
configuration in deploy workflows. Only the bot token belongs in Secret Manager:

```bash
printf '%s' "$DISCORD_BOT_TOKEN" | gcloud secrets versions add zeta-dev-discord-bot-token \
  --data-file=- --project="$PROJECT_ID"

printf '%s' "$DISCORD_BOT_TOKEN" | gcloud secrets versions add zeta-prod-discord-bot-token \
  --data-file=- --project="$PROJECT_ID"
```

## Terraform Ownership

Terraform modules under `infra/terraform/modules/` manage:

- Cloud Run service shells, scaling, public IAM, and domain mappings
- Artifact Registry and GitHub WIF/deploy IAM
- Cloud SQL and its generated `DB_URL`
- Agora recording storage and generated HMAC credentials
- Cloud Scheduler jobs and related IAM

Deploy workflows own images and Cloud Run container runtime bindings. The Cloud Run module intentionally allows deployments to update container configuration without Terraform continually reverting it.

Run infrastructure changes through `.github/workflows/infra.yml`, review `plan`, then run `apply`. A full prod Terraform apply is required before the first production tag deployment creates or updates dedicated prod services and domain mappings.

## Runtime Configuration Changes

For every new or changed application variable:

1. Find application reads and tests.
2. Classify the value as secret, generated secret, plain runtime config, CI config, or infrastructure.
3. Update `.env.example` with a safe placeholder.
4. Update both dev and prod deployment bindings, or document the intentional difference.
5. Update Terraform only when infrastructure, IAM, generated values, or outputs depend on it.
6. Update WorkOS callbacks, Resend/DNS, or other provider dashboards when URLs/domains change.
7. Deploy and inspect the Cloud Run env binding by source type without printing secret payloads.

Use the repository audit helper before and after edits:

```bash
.agents/skills/infra-configuration/scripts/audit_runtime_config.sh \
  FRONTEND_URL WORKOS_API_KEY API_URL
```

For removals, stop application usage and remove Cloud Run binding first. Delete or disable a secret only after no active service/revision uses it and its Terraform/manual ownership is known.

## Database Migrations

Deploy workflows run pending migrations through Cloud SQL Auth Proxy before deploying the API. Local migrations use:

```bash
make db:migrate:up
```

Manual Cloud SQL migration access is exceptional because it requires reading `DB_URL`. Mask and handle the value as sensitive; do not print it into logs or task reports.

## Rollback

Deploy an immutable prior image tag to the environment-specific service. Examples:

```bash
gcloud run deploy zeta-api-dev \
  --image europe-west1-docker.pkg.dev/PROJECT/zeta/api:PREVIOUS_SHA \
  --region europe-west1 --project PROJECT

gcloud run deploy zeta-api-prod \
  --image europe-west1-docker.pkg.dev/PROJECT/zeta/api:v1.2.2 \
  --region europe-west1 --project PROJECT
```

After rollback, verify runtime env/secret bindings because image rollback and configuration rollback are separate operations.
