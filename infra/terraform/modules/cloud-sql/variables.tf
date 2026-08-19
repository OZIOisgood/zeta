variable "project_id" {
  type        = string
  description = "GCP project ID"
}

variable "region" {
  type        = string
  description = "GCP region"
  default     = "europe-west1"
}

variable "environment" {
  type        = string
  description = "Deployment environment (dev or prod)"
}

variable "tier" {
  type        = string
  description = "Cloud SQL machine type"
  default     = "db-f1-micro"
}

variable "disk_size_gb" {
  type        = number
  description = "Disk size in GB"
  default     = 10
}

variable "availability_type" {
  type        = string
  description = "Cloud SQL availability topology: ZONAL or REGIONAL"
  default     = "ZONAL"
}

variable "deletion_protection" {
  type        = bool
  description = "Prevent accidental deletion"
  default     = true
}
