output "dashboard_id" {
  description = "Monitoring dashboard resource ID"
  value       = google_monitoring_dashboard.overview.id
}

output "dashboard_url" {
  description = "Google Cloud Console URL for the Monitoring dashboard"
  value       = "https://console.cloud.google.com/monitoring/dashboards/builder/${basename(google_monitoring_dashboard.overview.id)}?project=${var.project_id}"
}

output "uptime_check_id" {
  description = "API uptime check ID"
  value       = google_monitoring_uptime_check_config.api.uptime_check_id
}
