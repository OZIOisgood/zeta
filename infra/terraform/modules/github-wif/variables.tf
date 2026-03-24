variable "project_id" {
  type        = string
  description = "GCP project ID"
}

variable "github_repo" {
  type        = string
  description = "GitHub repository in owner/repo format (e.g. OZIOisgood/zeta)"
}

variable "environment" {
  type        = string
  description = "Deployment environment (dev or prod)"
}

variable "tf_state_bucket" {
  type        = string
  description = "GCS bucket name that holds Terraform state"
  default     = "zeta-terraform-state"
}
