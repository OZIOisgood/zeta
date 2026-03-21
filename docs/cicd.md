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
| CI | `.github/workflows/ci.yml` | Pull request → `main` | Lint & build check |
| Deploy Dev | `.github/workflows/deploy-dev.yml` | Push to `main` | Build image, deploy to dev Cloud Run |
| Deploy Prod | `.github/workflows/deploy-prod.yml` | Push of `v*` tag | Build image, deploy to prod Cloud Run |
| Infra | `.github/workflows/infra.yml` | Manual (`workflow_dispatch`) | Terraform plan / apply for dev or prod |

---

## GCP Authentication — Workload Identity Federation

All workflows authenticate to GCP using **Workload Identity Federation (WIF)** — no long-lived service account JSON keys are stored anywhere.

### Why WIF over a JSON key?

- JSON keys are long-lived credentials that can leak.  
- WIF uses short-lived OIDC tokens issued by GitHub for each run.  
- This is the current GCP-recommended approach for CI/CD.

### One-time GCP setup

```bash
PROJECT_ID=your-gcp-project-id
PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format='value(projectNumber)')
SA_NAME=zeta-github-actions

# 1. Create a service account
gcloud iam service-accounts create $SA_NAME \
  --display-name="Zeta GitHub Actions" \
  --project=$PROJECT_ID

# 2. Grant required roles
for ROLE in \
  roles/run.admin \
  roles/artifactregistry.writer \
  roles/secretmanager.secretAccessor \
  roles/iam.serviceAccountUser \
  roles/storage.objectAdmin; do
  gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:${SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com" \
    --role="$ROLE"
done

# 3. Create a Workload Identity Pool
gcloud iam workload-identity-pools create github \
  --location=global \
  --display-name="GitHub Actions Pool" \
  --project=$PROJECT_ID

# 4. Create a provider in the pool
gcloud iam workload-identity-pools providers create-oidc github-provider \
  --location=global \
  --workload-identity-pool=github \
  --issuer-uri="https://token.actions.githubusercontent.com" \
  --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository" \
  --project=$PROJECT_ID

# 5. Bind the service account to the provider (replace ORG/REPO)
gcloud iam service-accounts add-iam-policy-binding \
  "${SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/github/attribute.repository/OZIOisgood/zeta" \
  --project=$PROJECT_ID

# 6. Create the Terraform state bucket
gsutil mb -p $PROJECT_ID -l europe-west1 gs://zeta-terraform-state
gsutil versioning set on gs://zeta-terraform-state
```

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
| `CLOUD_RUN_DEV_URL` | `zeta-api-abc123-ew.a.run.app` (dev service URL, no `https://`) |
| `CLOUD_RUN_PROD_URL` | `zeta-api-xyz789-ew.a.run.app` (prod service URL) |
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

| Secret Manager name | Maps to env var |
|--------------------|-----------------|
| `zeta-dev-db-url` | `DB_URL` |
| `zeta-dev-workos-api-key` | `WORKOS_API_KEY` |
| `zeta-prod-db-url` | `DB_URL` |
| `zeta-prod-workos-api-key` | `WORKOS_API_KEY` |

Create secrets:

```bash
echo -n "postgres://..." | gcloud secrets create zeta-dev-db-url \
  --data-file=- --project=$PROJECT_ID

# Grant the Cloud Run service account access
gcloud secrets add-iam-policy-binding zeta-dev-db-url \
  --member="serviceAccount:${SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor" \
  --project=$PROJECT_ID
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

Terraform manages the Cloud Run service configuration and the Artifact Registry repository. Application secrets are managed separately in Secret Manager (see above).

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
| Database migrations | 🔵 Manual (`make db:migrate:up` against Cloud SQL) |
| Create GCP secrets | 🔵 Manual (one-time, via gcloud CLI) |
| WIF & IAM setup | 🔵 Manual (one-time, see setup above) |
