# CI/CD & Infrastructure

This document describes the CI/CD pipeline and infrastructure-as-code setup for Zeta.

---

## Environments

| Environment | Purpose | Deployment trigger |
|-------------|---------|-------------------|
| `local`     | Developer laptop, Docker Compose | `make infra:restart` |
| `dev`       | Shared dev/staging, Cloud Run | Push to `main` branch |
| `prod`      | Production, Cloud Run | Push of a `v*` tag |

---

## GitHub Actions Workflows

| Workflow | File | Trigger | Purpose |
|----------|------|---------|---------|
| CI | `.github/workflows/ci.yml` | Pull request → `main` | Lint & build check (API + Dashboard) |
| Deploy Dev | `.github/workflows/deploy-dev.yml` | Push to `main` | Build & deploy API + Dashboard to dev Cloud Run |
| Deploy Prod | `.github/workflows/deploy-prod.yml` | Push of `v*` tag | Build & deploy API + Dashboard to prod Cloud Run |
| Infra | `.github/workflows/infra.yml` | Manual (`workflow_dispatch`) | Terraform plan / apply for dev or prod |

---

## GCP Authentication — Workload Identity Federation

All workflows authenticate to GCP using **Workload Identity Federation (WIF)** — no long-lived service account JSON keys are stored anywhere.

### Why WIF over a JSON key?

- JSON keys are long-lived credentials that can leak.  
- WIF uses short-lived OIDC tokens issued by GitHub for each run.  
- This is the current GCP-recommended approach for CI/CD.

### Infrastructure via Terraform

WIF pools, OIDC providers, deploy service accounts, and all IAM bindings are managed by Terraform modules:

| Module | Path | Resources |
|--------|------|-----------|
| `github-wif` | `infra/terraform/modules/github-wif/` | WIF pool & OIDC provider, deploy SA, IAM roles (`run.admin`, `artifactregistry.writer`, `secretmanager.secretAccessor`, `iam.serviceAccountUser`), actAs binding on default Compute Engine SA |
| `cloud-run` | `infra/terraform/modules/cloud-run/` | Cloud Run service (reusable for API + Dashboard), public IAM policy |
| `cloud-sql` | `infra/terraform/modules/cloud-sql/` | Cloud SQL PostgreSQL instance, database, user, DB_URL secret, `cloudsql.client` IAM |

### Cloud Run Services

| Service | Image | Port | Purpose |
|---------|-------|------|---------|
| `zeta-api` | `zeta/api` | 8080 | Go REST API with Cloud SQL Auth Proxy |
| `zeta-dashboard` | `zeta/dashboard` | 8080 | Angular SPA served by Nginx |

The dashboard uses runtime env substitution: the `__API_URL__` placeholder in the compiled JS is replaced with the `API_URL` env var at container startup via `sed`.

### One-time manual prerequisites

```bash
PROJECT_ID=your-gcp-project-id

# 1. Create the Terraform state bucket
gsutil mb -p $PROJECT_ID -l europe-west1 gs://zeta-terraform-state
gsutil versioning set on gs://zeta-terraform-state

# 2. Apply Terraform for each environment
cd infra/terraform/envs/dev
terraform init
terraform apply -var="project_id=$PROJECT_ID"

cd ../prod
terraform init
terraform apply -var="project_id=$PROJECT_ID"
```

After applying, get the WIF provider and service account email from the Terraform outputs and add them as GitHub environment secrets (see below).

---

## GitHub Environments & Secrets

Create two **GitHub Environments** (`dev` and `prod`) in *Settings → Environments*.  
Add a **Required reviewer** to `prod` to enforce a manual approval gate.

### Secrets (per environment)

| Secret | Description |
|--------|-------------|
| `GCP_WIF_PROVIDER` | Workload Identity provider resource name, e.g. `projects/123/locations/global/workloadIdentityPools/github/providers/github-provider` |
| `GCP_SERVICE_ACCOUNT` | Service account email, e.g. `zeta-github-actions@PROJECT.iam.gserviceaccount.com` |

### Variables (per environment)

| Variable | Example |
|----------|---------|
| `GCP_PROJECT_ID` | `my-gcp-project` |
| `CLOUD_RUN_DEV_URL` | `zeta-api-abc123-ew.a.run.app` (API service URL, no `https://`) |
| `CLOUD_RUN_DEV_DASHBOARD_URL` | `zeta-dashboard-abc123-ew.a.run.app` (Dashboard URL, no `https://`) |
| `CLOUD_RUN_PROD_URL` | `zeta-api-xyz789-ew.a.run.app` (prod API URL) |
| `CLOUD_RUN_PROD_DASHBOARD_URL` | `zeta-dashboard-xyz789-ew.a.run.app` (prod Dashboard URL) |
| `WORKOS_DEV_DEFAULT_ORG_ID` | `org_...` |
| `WORKOS_PROD_DEFAULT_ORG_ID` | `org_...` |

---

## Application Secrets — Google Secret Manager

Application secrets (DB passwords, API keys) are stored in **Google Secret Manager** and injected into Cloud Run at deploy time via `--set-secrets`.

### Naming convention

```
zeta-{env}-{secret-name}
```

Examples:

| Secret Manager name | Maps to env var | Managed by |
|--------------------|-----------------|------------|
| `zeta-dev-db-url` | `DB_URL` | Terraform (cloud-sql module) |
| `zeta-dev-workos-api-key` | `WORKOS_API_KEY` | Manual |
| `zeta-prod-db-url` | `DB_URL` | Terraform (cloud-sql module) |
| `zeta-prod-workos-api-key` | `WORKOS_API_KEY` | Manual |

The `DB_URL` secret is automatically created and updated by the `cloud-sql` Terraform module. Other secrets must be created manually:

```bash
echo -n "sk-..." | gcloud secrets create zeta-dev-workos-api-key \
  --data-file=- --project=$PROJECT_ID
```

---

## Cloud SQL — PostgreSQL

Each environment has a Cloud SQL PostgreSQL 16 instance managed by the `cloud-sql` Terraform module.

### Architecture

| Component | Dev | Prod |
|-----------|-----|------|
| Instance | `zeta-dev` | `zeta-prod` |
| Tier | `db-f1-micro` | `db-f1-micro` |
| Availability | `ZONAL` | `REGIONAL` (automatic failover) |
| Database | `zeta` | `zeta` |
| User | `zeta` | `zeta` |

### Connectivity — Cloud SQL Auth Proxy

Cloud Run connects to Cloud SQL via the **built-in Cloud SQL Auth Proxy** (`--add-cloudsql-instances` flag in the deploy workflow). This creates a secure tunnel using IAM — no public IP authorization or VPC connector needed.

The connection string uses a Unix socket path:

```
postgres://zeta:<password>@/zeta?host=/cloudsql/<connection_name>&sslmode=disable
```

The default Compute Engine service account (Cloud Run runtime identity) is granted `roles/cloudsql.client` by the `cloud-sql` Terraform module.

### Running Migrations

Migrations use [golang-migrate](https://github.com/golang-migrate/migrate) and are in `db/migrations/`.

**Against Cloud SQL (dev):**

```bash
# 1. Start the Cloud SQL Auth Proxy locally
cloud-sql-proxy zeta-491012:europe-west1:zeta-dev --port=15432 &

# 2. Get the password (from Secret Manager or Terraform state)
gcloud secrets versions access latest --secret=zeta-dev-db-url --project=zeta-491012

# 3. Run migrations
migrate -path db/migrations \
  -database "postgres://zeta:<password>@localhost:15432/zeta?sslmode=disable" up

# 4. Stop the proxy
kill %1
```

**Against local Docker Compose:**

```bash
make db:migrate:up
```

---

## Image Tagging & Versioning

| Tag | When set | Meaning |
|-----|----------|---------|
| `<git-sha>` | Every deploy | Exact immutable reference |
| `latest` | Every push to `main` | Latest dev build |
| `v1.2.3` (semver) | Tag push | Production release |
| `stable` | Every tag push | Current prod image |

### Rollback

Roll back dev to a previous SHA:

```bash
gcloud run deploy zeta-api \
  --image europe-west1-docker.pkg.dev/PROJECT/zeta/api:<previous-sha> \
  --region europe-west1 --project PROJECT
```

Roll back prod to a previous tag:

```bash
gcloud run deploy zeta-api \
  --image europe-west1-docker.pkg.dev/PROJECT/zeta/api:v1.2.2 \
  --region europe-west1 --project PROJECT
```

---

## Infrastructure Deployment

Terraform manages Cloud Run services, Artifact Registry, Workload Identity Federation, Cloud SQL, and all IAM bindings. Application secrets (except `DB_URL`) are managed separately in Secret Manager.

### Terraform modules

| Module | Purpose |
|--------|---------|
| `cloud-run` | Cloud Run v2 service definition, public IAM (used for both API and Dashboard) |
| `github-wif` | WIF pool/provider, deploy SA, IAM roles |
| `cloud-sql` | Cloud SQL instance, database, user, DB_URL secret, `cloudsql.client` IAM |

### First-time setup

```bash
cd infra/terraform/envs/dev
terraform init
terraform apply -var="project_id=YOUR_PROJECT_ID"
```

### Ongoing updates via GitHub Actions

1. Go to **Actions → Infra**.
2. Click **Run workflow**, choose environment (`dev` or `prod`) and action (`plan` or `apply`).
3. Review the plan output in the `plan` run, then trigger `apply`.

---

## What is Automated vs Manual

| Task | Automation |
|------|-----------|
| Build & lint check on PR | ✅ Automatic (CI workflow) |
| Deploy to dev | ✅ Automatic (push to `main`) |
| Deploy to prod | ✅ Automatic + manual approval gate (push `v*` tag) |
| Terraform infra changes | 🔵 Manual trigger (workflow_dispatch) |
| Database migrations | 🔵 Manual (`migrate` via Cloud SQL Auth Proxy) |
| Create GCP secrets | 🔵 Manual (one-time, via gcloud CLI — except `DB_URL` which is Terraform-managed) |
| WIF & IAM setup | ✅ Automated via Terraform (`github-wif` module) |
| Cloud SQL provisioning | ✅ Automated via Terraform (`cloud-sql` module) |
