resource "google_service_account" "deploy" {
  project      = var.project_id
  account_id   = "zeta-deploy-${var.environment}"
  display_name = "Zeta Deploy (${var.environment})"
  description  = "Service account used by GitHub Actions to deploy to ${var.environment}"
}

# Grant the deploy SA permission to deploy Cloud Run services.
resource "google_project_iam_member" "run_admin" {
  project = var.project_id
  role    = "roles/run.admin"
  member  = "serviceAccount:${google_service_account.deploy.email}"
}

# Allow the deploy SA to act as itself (required for Cloud Run deploys).
resource "google_service_account_iam_member" "act_as" {
  service_account_id = google_service_account.deploy.name
  role               = "roles/iam.serviceAccountUser"
  member             = "serviceAccount:${google_service_account.deploy.email}"
}

# Allow the deploy SA to act as the default Compute Engine SA (Cloud Run runtime identity).
data "google_project" "current" {
  project_id = var.project_id
}

resource "google_service_account_iam_member" "act_as_compute" {
  service_account_id = "projects/${var.project_id}/serviceAccounts/${data.google_project.current.number}-compute@developer.gserviceaccount.com"
  role               = "roles/iam.serviceAccountUser"
  member             = "serviceAccount:${google_service_account.deploy.email}"
}

# Allow the deploy SA to push images to Artifact Registry.
resource "google_project_iam_member" "artifact_writer" {
  project = var.project_id
  role    = "roles/artifactregistry.writer"
  member  = "serviceAccount:${google_service_account.deploy.email}"
}

# Allow the deploy SA to access secrets (runtime read access for Cloud Run).
resource "google_project_iam_member" "secret_accessor" {
  project = var.project_id
  role    = "roles/secretmanager.secretAccessor"
  member  = "serviceAccount:${google_service_account.deploy.email}"
}

# Allow the deploy SA to manage secrets via Terraform (create/update/delete).
resource "google_project_iam_member" "secret_admin" {
  project = var.project_id
  role    = "roles/secretmanager.admin"
  member  = "serviceAccount:${google_service_account.deploy.email}"
}

# Allow the deploy SA to manage Cloud SQL instances via Terraform.
resource "google_project_iam_member" "cloudsql_admin" {
  project = var.project_id
  role    = "roles/cloudsql.admin"
  member  = "serviceAccount:${google_service_account.deploy.email}"
}

# Allow the deploy SA to manage IAM on service accounts via Terraform.
resource "google_project_iam_member" "sa_admin" {
  project = var.project_id
  role    = "roles/iam.serviceAccountAdmin"
  member  = "serviceAccount:${google_service_account.deploy.email}"
}

# Allow the deploy SA to manage project-level IAM bindings via Terraform.
resource "google_project_iam_member" "project_iam_admin" {
  project = var.project_id
  role    = "roles/resourcemanager.projectIamAdmin"
  member  = "serviceAccount:${google_service_account.deploy.email}"
}

# Allow the deploy SA to manage Workload Identity Pools via Terraform.
resource "google_project_iam_member" "wif_admin" {
  project = var.project_id
  role    = "roles/iam.workloadIdentityPoolAdmin"
  member  = "serviceAccount:${google_service_account.deploy.email}"
}

# Allow the deploy SA to manage Terraform state bucket (read/write objects + manage bucket IAM).
resource "google_storage_bucket_iam_member" "tf_state" {
  bucket = var.tf_state_bucket
  role   = "roles/storage.admin"
  member = "serviceAccount:${google_service_account.deploy.email}"
}

# Workload Identity Pool — one per environment.
resource "google_iam_workload_identity_pool" "github" {
  project                   = var.project_id
  workload_identity_pool_id = "github-${var.environment}"
  display_name              = "GitHub (${var.environment})"
  description               = "WIF pool for GitHub Actions — ${var.environment}"
}

# OIDC provider pointing at GitHub Actions.
resource "google_iam_workload_identity_pool_provider" "github" {
  project                            = var.project_id
  workload_identity_pool_id          = google_iam_workload_identity_pool.github.workload_identity_pool_id
  workload_identity_pool_provider_id = "github-oidc"
  display_name                       = "GitHub OIDC"

  attribute_mapping = {
    "google.subject"       = "assertion.sub"
    "attribute.actor"      = "assertion.actor"
    "attribute.repository" = "assertion.repository"
  }

  attribute_condition = "assertion.repository == \"${var.github_repo}\""

  oidc {
    issuer_uri = "https://token.actions.githubusercontent.com"
  }
}

# Allow GitHub Actions tokens (scoped to the repo) to impersonate the deploy SA.
resource "google_service_account_iam_member" "wif_binding" {
  service_account_id = google_service_account.deploy.name
  role               = "roles/iam.workloadIdentityUser"
  member             = "principalSet://iam.googleapis.com/${google_iam_workload_identity_pool.github.name}/attribute.repository/${var.github_repo}"
}
