terraform {
  required_version = ">= 1.10"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 6.0"
    }
  }

  backend "gcs" {
    bucket = "zeta-terraform-state"
    prefix = "dev"
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

data "google_project" "current" {
  project_id = var.project_id
}

locals {
  cloud_run_runtime_service_account = "${data.google_project.current.number}-compute@developer.gserviceaccount.com"
  dashboard_domain                  = "dev.zeta.m4xon.com"
  api_domain                        = "api.dev.zeta.m4xon.com"
  resend_from_email                 = "notifications@${local.dashboard_domain}"
  email_logo_url                    = "https://${local.dashboard_domain}/app-full-icon.png"
}

variable "project_id" {
  type = string
}

variable "region" {
  type    = string
  default = "europe-west1"
}

# Artifact Registry repository for Docker images.
resource "google_artifact_registry_repository" "images" {
  project       = var.project_id
  location      = var.region
  repository_id = "zeta"
  format        = "DOCKER"
  description   = "Docker images for Zeta"
}

module "cloud_run" {
  source = "../../modules/cloud-run"

  project_id    = var.project_id
  region        = var.region
  service_name  = "zeta-api"
  environment   = "dev"
  image         = "${var.region}-docker.pkg.dev/${var.project_id}/zeta/api:latest"
  min_instances = 0
  max_instances = 3
  memory        = "512Mi"
  cpu           = "1"
}

module "cloud_run_dashboard" {
  source = "../../modules/cloud-run"

  project_id    = var.project_id
  region        = var.region
  service_name  = "zeta-dashboard"
  environment   = "dev"
  image         = "${var.region}-docker.pkg.dev/${var.project_id}/zeta/dashboard:latest"
  min_instances = 0
  max_instances = 2
  memory        = "256Mi"
  cpu           = "1"
}

module "github_wif" {
  source = "../../modules/github-wif"

  project_id  = var.project_id
  github_repo = "OZIOisgood/zeta"
  environment = "dev"
}

module "cloud_sql" {
  source = "../../modules/cloud-sql"

  project_id          = var.project_id
  region              = var.region
  environment         = "dev"
  tier                = "db-f1-micro"
  disk_size_gb        = 10
  availability_type   = "ZONAL"
  deletion_protection = false
}

module "agora_recording_storage" {
  source = "../../modules/agora-recording-storage"

  project_id    = var.project_id
  region        = var.region
  environment   = "dev"
  force_destroy = true

  depends_on = [module.github_wif]
}

resource "google_storage_bucket_iam_member" "api_recording_storage_viewer" {
  bucket = module.agora_recording_storage.bucket_name
  role   = "roles/storage.objectViewer"
  member = "serviceAccount:${local.cloud_run_runtime_service_account}"
}

resource "google_service_account_iam_member" "api_recording_signed_url_token_creator" {
  service_account_id = "projects/${var.project_id}/serviceAccounts/${local.cloud_run_runtime_service_account}"
  role               = "roles/iam.serviceAccountTokenCreator"
  member             = "serviceAccount:${local.cloud_run_runtime_service_account}"
}

output "service_url" {
  value = module.cloud_run.service_url
}

output "wif_provider" {
  value = module.github_wif.workload_identity_provider
}

output "deploy_service_account" {
  value = module.github_wif.service_account_email
}

output "db_instance" {
  value = module.cloud_sql.instance_connection_name
}

output "db_public_ip" {
  value = module.cloud_sql.public_ip
}

# /* --------------------------------- DOMAIN MAPPING --------------------------------- */

module "domain_mapping_dashboard" {
  source = "../../modules/domain-mapping"

  project_id   = var.project_id
  region       = var.region
  domain       = local.dashboard_domain
  service_name = "zeta-dashboard"
}

module "domain_mapping_api" {
  source = "../../modules/domain-mapping"

  project_id   = var.project_id
  region       = var.region
  domain       = local.api_domain
  service_name = "zeta-api"
}

output "dashboard_url" {
  value = module.cloud_run_dashboard.service_url
}

# /* --------------------------------- CLOUD SCHEDULER --------------------------------- */

variable "scheduler_secret" {
  type      = string
  sensitive = true
}

resource "google_cloud_scheduler_job" "coaching_reminders" {
  name             = "coaching-reminders"
  region           = var.region
  schedule         = "*/5 * * * *"
  time_zone        = "UTC"
  attempt_deadline = "30s"
  depends_on       = [module.github_wif]

  http_target {
    uri         = "${module.cloud_run.service_url}/internal/coaching/reminders"
    http_method = "POST"
    headers = {
      "Authorization" = "Bearer ${var.scheduler_secret}"
    }
  }
}

resource "google_cloud_scheduler_job" "coaching_recordings_cleanup" {
  name             = "coaching-recordings-cleanup"
  region           = var.region
  schedule         = "*/5 * * * *"
  time_zone        = "UTC"
  attempt_deadline = "30s"
  depends_on       = [module.github_wif]

  http_target {
    uri         = "${module.cloud_run.service_url}/internal/coaching/recordings/cleanup"
    http_method = "POST"
    headers = {
      "Authorization" = "Bearer ${var.scheduler_secret}"
    }
  }
}

resource "google_cloud_scheduler_job" "audit_maintenance" {
  name             = "audit-maintenance"
  region           = var.region
  schedule         = "0 3 * * *"
  time_zone        = "UTC"
  attempt_deadline = "30s"
  depends_on       = [module.github_wif]

  http_target {
    uri         = "${module.cloud_run.service_url}/internal/audit/maintenance"
    http_method = "POST"
    headers = {
      "Authorization" = "Bearer ${var.scheduler_secret}"
    }
  }
}

output "dashboard_domain" {
  value = local.dashboard_domain
}

output "api_domain" {
  value = local.api_domain
}

output "resend_from_email" {
  value = local.resend_from_email
}

output "email_logo_url" {
  value = local.email_logo_url
}
