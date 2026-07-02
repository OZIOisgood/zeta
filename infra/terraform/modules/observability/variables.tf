variable "project_id" {
  type        = string
  description = "GCP project that owns the monitored resources"
}

variable "environment" {
  type        = string
  description = "Deployment environment shown in dashboards and alerts"
}

variable "api_service_name" {
  type        = string
  description = "Cloud Run API service name"
}

variable "dashboard_service_name" {
  type        = string
  description = "Cloud Run dashboard service name"
}

variable "cloud_sql_instance_name" {
  type        = string
  description = "Cloud SQL instance name without the project prefix"
}

variable "api_host" {
  type        = string
  description = "Public API host used by the HTTPS uptime check"
}

variable "notification_email" {
  type        = string
  description = "Optional shared email address for alert notifications"
  default     = ""
}

variable "viewer_members" {
  type        = set(string)
  description = "IAM members allowed to view dashboards, logs, errors, and traces"
  default     = []

  validation {
    condition = alltrue([
      for member in var.viewer_members :
      startswith(member, "user:") || startswith(member, "group:")
    ])
    error_message = "Viewer members must use user:email or group:email IAM syntax."
  }
}
