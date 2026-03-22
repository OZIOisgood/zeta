output "instance_name" {
  description = "Cloud SQL instance name"
  value       = google_sql_database_instance.main.name
}

output "instance_connection_name" {
  description = "Cloud SQL instance connection name (project:region:instance)"
  value       = google_sql_database_instance.main.connection_name
}

output "public_ip" {
  description = "Public IP address of the Cloud SQL instance"
  value       = google_sql_database_instance.main.public_ip_address
}

output "database_name" {
  description = "Name of the application database"
  value       = google_sql_database.app.name
}

output "db_url_secret_id" {
  description = "Secret Manager secret ID for DB_URL"
  value       = google_secret_manager_secret.db_url.secret_id
}
