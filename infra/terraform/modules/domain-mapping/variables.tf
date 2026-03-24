variable "project_id" {
  type        = string
  description = "GCP project ID"
}

variable "region" {
  type        = string
  description = "GCP region"
  default     = "europe-west1"
}

variable "domain" {
  type        = string
  description = "Custom domain name to map to the Cloud Run service"
}

variable "service_name" {
  type        = string
  description = "Cloud Run service name to route the domain to"
}
