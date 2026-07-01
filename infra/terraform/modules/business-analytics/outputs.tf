output "dataset_id" {
  description = "BigQuery analytics dataset ID"
  value       = google_bigquery_dataset.analytics.dataset_id
}

output "dataset_console_url" {
  description = "Google Cloud Console URL for the analytics dataset"
  value       = "https://console.cloud.google.com/bigquery?project=${var.project_id}&ws=!1m4!1m3!3m2!1s${var.project_id}!2s${google_bigquery_dataset.analytics.dataset_id}"
}

output "connection_id" {
  description = "BigQuery Cloud SQL connection resource name"
  value       = google_bigquery_connection.cloud_sql.name
}

output "scheduled_query_id" {
  description = "BigQuery Data Transfer scheduled query ID"
  value       = google_bigquery_data_transfer_config.business_snapshot.id
}

