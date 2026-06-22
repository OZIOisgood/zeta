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
    prefix = "prod"
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
  landing_domain                    = "strido.net"
  dashboard_domain                  = "app.strido.net"
  api_domain                        = "api.strido.net"
  resend_from_email                 = "notifications@${local.landing_domain}"
}

variable "project_id" {
  type = string
}

variable "region" {
  type    = string
  default = "europe-west1"
}

# Accepted by the shared Infra workflow. Production observability is enabled
# only after the dev dashboard and alert thresholds have been tuned.
variable "observability_notification_email" {
  type    = string
  default = ""
}

variable "observability_viewer_members_csv" {
  type    = string
  default = ""
}

# Dev and prod originally shared these Cloud Run resources in the same GCP
# project. Keep the legacy services running during the blue-green migration,
# but stop managing them from prod state before creating dedicated services.
removed {
  from = module.cloud_run.google_cloud_run_v2_service.app

  lifecycle {
    destroy = false
  }
}

removed {
  from = module.cloud_run.google_cloud_run_v2_service_iam_member.public

  lifecycle {
    destroy = false
  }
}

removed {
  from = module.cloud_run_dashboard.google_cloud_run_v2_service.app

  lifecycle {
    destroy = false
  }
}

removed {
  from = module.cloud_run_dashboard.google_cloud_run_v2_service_iam_member.public

  lifecycle {
    destroy = false
  }
}

module "cloud_run_prod" {
  source = "../../modules/cloud-run"

  project_id    = var.project_id
  region        = var.region
  service_name  = "zeta-api-prod"
  environment   = "prod"
  image         = "${var.region}-docker.pkg.dev/${var.project_id}/zeta/api:stable"
  min_instances = 1
  max_instances = 10
  memory        = "1Gi"
  cpu           = "1"
}

module "cloud_run_dashboard_prod" {
  source = "../../modules/cloud-run"

  project_id    = var.project_id
  region        = var.region
  service_name  = "zeta-dashboard-prod"
  environment   = "prod"
  image         = "${var.region}-docker.pkg.dev/${var.project_id}/zeta/dashboard:stable"
  min_instances = 1
  max_instances = 5
  memory        = "256Mi"
  cpu           = "1"
}

module "cloud_run_landing" {
  source = "../../modules/cloud-run"

  project_id    = var.project_id
  region        = var.region
  service_name  = "zeta-landing"
  environment   = "prod"
  image         = "${var.region}-docker.pkg.dev/${var.project_id}/zeta/landing:stable"
  min_instances = 0
  max_instances = 2
  memory        = "256Mi"
  cpu           = "1"
}

module "github_wif" {
  source = "../../modules/github-wif"

  project_id  = var.project_id
  github_repo = "OZIOisgood/zeta"
  environment = "prod"
}

module "cloud_sql" {
  source = "../../modules/cloud-sql"

  project_id          = var.project_id
  region              = var.region
  environment         = "prod"
  tier                = "db-f1-micro"
  disk_size_gb        = 10
  availability_type   = "REGIONAL"
  deletion_protection = true
}

module "agora_recording_storage" {
  source = "../../modules/agora-recording-storage"

  project_id    = var.project_id
  region        = var.region
  environment   = "prod"
  force_destroy = false

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
  value = module.cloud_run_prod.service_url
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

module "domain_mapping_landing" {
  source = "../../modules/domain-mapping"

  project_id   = var.project_id
  region       = var.region
  domain       = local.landing_domain
  service_name = "zeta-landing"

  depends_on = [module.cloud_run_landing]
}

module "domain_mapping_dashboard" {
  source = "../../modules/domain-mapping"

  project_id   = var.project_id
  region       = var.region
  domain       = local.dashboard_domain
  service_name = "zeta-dashboard-prod"

  depends_on = [module.cloud_run_dashboard_prod]
}

module "domain_mapping_api" {
  source = "../../modules/domain-mapping"

  project_id   = var.project_id
  region       = var.region
  domain       = local.api_domain
  service_name = "zeta-api-prod"

  depends_on = [module.cloud_run_prod]
}

output "dashboard_url" {
  value = module.cloud_run_dashboard_prod.service_url
}

output "landing_url" {
  value = module.cloud_run_landing.service_url
}

output "landing_domain" {
  value = local.landing_domain
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

output "dashboard_dns_records" {
  description = "DNS records to configure for the production dashboard domain"
  value       = module.domain_mapping_dashboard.dns_records
}

output "landing_dns_records" {
  description = "DNS records to configure for the production landing domain"
  value       = module.domain_mapping_landing.dns_records
}

output "api_dns_records" {
  description = "DNS records to configure for the production API domain"
  value       = module.domain_mapping_api.dns_records
}

# /* --------------------------------- CLOUD SCHEDULER --------------------------------- */

variable "scheduler_secret" {
  type      = string
  sensitive = true
}

resource "google_cloud_scheduler_job" "coaching_reminders" {
  name             = "coaching-reminders-prod"
  region           = var.region
  schedule         = "*/5 * * * *"
  time_zone        = "UTC"
  attempt_deadline = "30s"
  depends_on       = [module.github_wif]

  http_target {
    uri         = "${module.cloud_run_prod.service_url}/internal/coaching/reminders"
    http_method = "POST"
    headers = {
      "Authorization" = "Bearer ${var.scheduler_secret}"
    }
  }
}

resource "google_cloud_scheduler_job" "coaching_recordings_cleanup" {
  name             = "coaching-recordings-cleanup-prod"
  region           = var.region
  schedule         = "*/5 * * * *"
  time_zone        = "UTC"
  attempt_deadline = "30s"
  depends_on       = [module.github_wif]

  http_target {
    uri         = "${module.cloud_run_prod.service_url}/internal/coaching/recordings/cleanup"
    http_method = "POST"
    headers = {
      "Authorization" = "Bearer ${var.scheduler_secret}"
    }
  }
}

resource "google_cloud_scheduler_job" "audit_maintenance" {
  name             = "audit-maintenance-prod"
  region           = var.region
  schedule         = "0 3 * * *"
  time_zone        = "UTC"
  attempt_deadline = "30s"
  depends_on       = [module.github_wif]

  http_target {
    uri         = "${module.cloud_run_prod.service_url}/internal/audit/maintenance"
    http_method = "POST"
    headers = {
      "Authorization" = "Bearer ${var.scheduler_secret}"
    }
  }
}

resource "google_cloud_scheduler_job" "inbound_email_reconcile" {
  name             = "inbound-email-reconcile-prod"
  region           = var.region
  schedule         = "*/5 * * * *"
  time_zone        = "UTC"
  attempt_deadline = "60s"
  depends_on       = [module.github_wif]

  http_target {
    uri         = "${module.cloud_run_prod.service_url}/internal/inbound-email/reconcile"
    http_method = "POST"
    headers = {
      "Authorization" = "Bearer ${var.scheduler_secret}"
    }
  }
}
