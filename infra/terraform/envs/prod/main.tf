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

variable "project_id" {
  type = string
}

variable "region" {
  type    = string
  default = "europe-west1"
}

module "cloud_run" {
  source = "../../modules/cloud-run"

  project_id    = var.project_id
  region        = var.region
  environment   = "prod"
  image         = "${var.region}-docker.pkg.dev/${var.project_id}/zeta/api:stable"
  min_instances = 1
  max_instances = 10
  memory        = "1Gi"
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
