variable "project_id" {
  type        = string
  description = "GCP project ID"
}

variable "service_name" {
  type        = string
  description = "Cloud Run service name"
  default     = "zeta-api"
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

variable "image" {
  type        = string
  description = "Full Docker image reference (with tag)"
}

variable "min_instances" {
  type        = number
  description = "Minimum number of Cloud Run instances"
  default     = 0
}

variable "max_instances" {
  type        = number
  description = "Maximum number of Cloud Run instances"
  default     = 5
}

variable "memory" {
  type        = string
  description = "Memory limit per Cloud Run instance"
  default     = "512Mi"
}

variable "cpu" {
  type        = string
  description = "CPU limit per Cloud Run instance"
  default     = "1"
}
