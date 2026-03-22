resource "random_password" "db" {
  length  = 24
  special = false
}

resource "google_sql_database_instance" "main" {
  project             = var.project_id
  name                = "zeta-${var.environment}"
  region              = var.region
  database_version    = "POSTGRES_16"
  deletion_protection = var.deletion_protection

  settings {
    edition           = "ENTERPRISE"
    tier              = var.tier
    availability_type = var.availability_type
    disk_size         = var.disk_size_gb
    disk_autoresize   = true

    ip_configuration {
      ipv4_enabled = true
    }

    backup_configuration {
      enabled                        = true
      point_in_time_recovery_enabled = var.environment == "prod"
      start_time                     = "03:00"
    }

    maintenance_window {
      day          = 7 # Sunday
      hour         = 4
      update_track = "stable"
    }

    database_flags {
      name  = "max_connections"
      value = "100"
    }
  }
}

resource "google_sql_database" "app" {
  project  = var.project_id
  instance = google_sql_database_instance.main.name
  name     = "zeta"
}

resource "google_sql_user" "app" {
  project  = var.project_id
  instance = google_sql_database_instance.main.name
  name     = "zeta"
  password = random_password.db.result
}

# Grant Cloud Run's default Compute Engine SA permission to connect via Cloud SQL Auth Proxy.
data "google_project" "current" {
  project_id = var.project_id
}

resource "google_project_iam_member" "cloudsql_client" {
  project = var.project_id
  role    = "roles/cloudsql.client"
  member  = "serviceAccount:${data.google_project.current.number}-compute@developer.gserviceaccount.com"
}

# Store the connection string in Secret Manager so Cloud Run can use it.
# Uses Unix socket path for Cloud SQL Auth Proxy (--add-cloudsql-instances).
resource "google_secret_manager_secret" "db_url" {
  project   = var.project_id
  secret_id = "zeta-${var.environment}-db-url"

  replication {
    auto {}
  }

  lifecycle {
    # If the secret already exists (e.g. created manually), import it.
    prevent_destroy = false
  }
}

resource "google_secret_manager_secret_version" "db_url" {
  secret = google_secret_manager_secret.db_url.id

  secret_data = "postgres://${google_sql_user.app.name}:${random_password.db.result}@/${google_sql_database.app.name}?host=/cloudsql/${google_sql_database_instance.main.connection_name}&sslmode=disable"
}
