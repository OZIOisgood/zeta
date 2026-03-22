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
  environment   = "dev"
  image         = "${var.region}-docker.pkg.dev/${var.project_id}/zeta/api:latest"
  min_instances = 0
  max_instances = 3
  memory        = "512Mi"
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
