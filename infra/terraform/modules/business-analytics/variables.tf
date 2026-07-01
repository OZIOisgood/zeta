variable "project_id" {
  type        = string
  description = "GCP project ID"
}

variable "region" {
  type        = string
  description = "Primary GCP region for regional resources"
}

variable "environment" {
  type        = string
  description = "Deployment environment, for example dev or prod"
}

variable "dataset_id" {
  type        = string
  description = "BigQuery dataset ID for business analytics aggregates"
}

variable "bigquery_location" {
  type        = string
  description = "BigQuery dataset, connection, and transfer location"
  default     = "europe-west1"
}

variable "cloud_sql_instance_name" {
  type        = string
  description = "Cloud SQL instance name"
}

variable "cloud_sql_instance_connection_name" {
  type        = string
  description = "Cloud SQL instance connection name in project:region:instance form"
}

variable "cloud_sql_database_name" {
  type        = string
  description = "Cloud SQL database name"
}

variable "viewer_members" {
  type        = set(string)
  description = "IAM principals that can read the analytics dataset and use Looker Studio with viewer credentials"
  default     = []
}

variable "deploy_service_account_email" {
  type        = string
  description = "Terraform deploy service account email allowed to create the scheduled query with the transfer service account"
  default     = ""
}

variable "refresh_schedule" {
  type        = string
  description = "BigQuery scheduled query refresh schedule"
  default     = "every day 02:30"
}

variable "refresh_disabled" {
  type        = bool
  description = "Disable automatic scheduled query refreshes"
  default     = false
}
