locals {
  labels = {
    app         = "zeta"
    environment = var.environment
    component   = "business-analytics"
  }

  analytics_db_user = "zeta_analytics_${var.environment}"
  connection_id     = "zeta_${var.environment}_cloud_sql"

  viewer_project_roles = [
    "roles/bigquery.jobUser",
  ]

  viewer_dataset_roles = [
    "roles/bigquery.dataViewer",
  ]

  viewer_project_bindings = {
    for pair in setproduct(var.viewer_members, local.viewer_project_roles) :
    "${pair[1]} ${pair[0]}" => {
      role   = pair[1]
      member = pair[0]
    }
  }

  viewer_dataset_bindings = {
    for pair in setproduct(var.viewer_members, local.viewer_dataset_roles) :
    "${pair[1]} ${pair[0]}" => {
      role   = pair[1]
      member = pair[0]
    }
  }

  video_uploads_schema = jsonencode([
    { name = "bucket_date", type = "DATE", mode = "NULLABLE" },
    { name = "bucket_week", type = "DATE", mode = "NULLABLE" },
    { name = "environment", type = "STRING", mode = "NULLABLE" },
    { name = "group_id", type = "STRING", mode = "NULLABLE" },
    { name = "group_name", type = "STRING", mode = "NULLABLE" },
    { name = "expert_id", type = "STRING", mode = "NULLABLE" },
    { name = "expert_display_name", type = "STRING", mode = "NULLABLE" },
    { name = "asset_status", type = "STRING", mode = "NULLABLE" },
    { name = "video_status", type = "STRING", mode = "NULLABLE" },
    { name = "submitted_uploads", type = "INT64", mode = "NULLABLE" },
    { name = "video_parts", type = "INT64", mode = "NULLABLE" },
    { name = "total_duration_seconds", type = "FLOAT64", mode = "NULLABLE" },
    { name = "exported_at", type = "TIMESTAMP", mode = "NULLABLE" },
  ])

  reviews_schema = jsonencode([
    { name = "bucket_date", type = "DATE", mode = "NULLABLE" },
    { name = "bucket_week", type = "DATE", mode = "NULLABLE" },
    { name = "environment", type = "STRING", mode = "NULLABLE" },
    { name = "group_id", type = "STRING", mode = "NULLABLE" },
    { name = "group_name", type = "STRING", mode = "NULLABLE" },
    { name = "expert_id", type = "STRING", mode = "NULLABLE" },
    { name = "expert_display_name", type = "STRING", mode = "NULLABLE" },
    { name = "review_comments", type = "INT64", mode = "NULLABLE" },
    { name = "reviewed_videos", type = "INT64", mode = "NULLABLE" },
    { name = "top_level_comments", type = "INT64", mode = "NULLABLE" },
    { name = "reply_comments", type = "INT64", mode = "NULLABLE" },
    { name = "timestamped_comments", type = "INT64", mode = "NULLABLE" },
    { name = "exported_at", type = "TIMESTAMP", mode = "NULLABLE" },
  ])

  live_coachings_schema = jsonencode([
    { name = "bucket_date", type = "DATE", mode = "NULLABLE" },
    { name = "bucket_week", type = "DATE", mode = "NULLABLE" },
    { name = "environment", type = "STRING", mode = "NULLABLE" },
    { name = "group_id", type = "STRING", mode = "NULLABLE" },
    { name = "group_name", type = "STRING", mode = "NULLABLE" },
    { name = "expert_id", type = "STRING", mode = "NULLABLE" },
    { name = "expert_display_name", type = "STRING", mode = "NULLABLE" },
    { name = "session_type_id", type = "STRING", mode = "NULLABLE" },
    { name = "session_type_name", type = "STRING", mode = "NULLABLE" },
    { name = "status", type = "STRING", mode = "NULLABLE" },
    { name = "bookings_count", type = "INT64", mode = "NULLABLE" },
    { name = "total_duration_minutes", type = "INT64", mode = "NULLABLE" },
    { name = "exported_at", type = "TIMESTAMP", mode = "NULLABLE" },
  ])

  export_runs_schema = jsonencode([
    { name = "run_id", type = "STRING", mode = "NULLABLE" },
    { name = "started_at", type = "TIMESTAMP", mode = "NULLABLE" },
    { name = "completed_at", type = "TIMESTAMP", mode = "NULLABLE" },
    { name = "environment", type = "STRING", mode = "NULLABLE" },
    { name = "status", type = "STRING", mode = "NULLABLE" },
    { name = "window_start", type = "DATE", mode = "NULLABLE" },
    { name = "window_end", type = "DATE", mode = "NULLABLE" },
    { name = "video_rows", type = "INT64", mode = "NULLABLE" },
    { name = "review_rows", type = "INT64", mode = "NULLABLE" },
    { name = "coaching_rows", type = "INT64", mode = "NULLABLE" },
    { name = "error", type = "STRING", mode = "NULLABLE" },
  ])

  refresh_query = templatefile("${path.module}/queries/business_snapshot.sql.tftpl", {
    project_id    = var.project_id
    dataset_id    = var.dataset_id
    environment   = var.environment
    connection_id = google_bigquery_connection.cloud_sql.name
  })
}

resource "google_project_service" "bigquery" {
  project            = var.project_id
  service            = "bigquery.googleapis.com"
  disable_on_destroy = false
}

resource "google_project_service" "bigquery_connection" {
  project            = var.project_id
  service            = "bigqueryconnection.googleapis.com"
  disable_on_destroy = false
}

resource "google_project_service" "bigquery_data_transfer" {
  project            = var.project_id
  service            = "bigquerydatatransfer.googleapis.com"
  disable_on_destroy = false
}

resource "random_password" "analytics_db" {
  length  = 24
  special = false
}

resource "google_sql_user" "analytics" {
  project  = var.project_id
  instance = var.cloud_sql_instance_name
  name     = local.analytics_db_user
  password = random_password.analytics_db.result
}

resource "google_bigquery_dataset" "analytics" {
  project                    = var.project_id
  dataset_id                 = var.dataset_id
  friendly_name              = "Zeta ${title(var.environment)} Business Analytics"
  description                = "Materialized business analytics aggregates for Zeta ${var.environment}."
  location                   = var.bigquery_location
  delete_contents_on_destroy = var.environment != "prod"
  labels                     = local.labels

  depends_on = [google_project_service.bigquery]
}

resource "google_bigquery_connection" "cloud_sql" {
  project       = var.project_id
  location      = var.bigquery_location
  connection_id = local.connection_id
  friendly_name = "Zeta ${title(var.environment)} Cloud SQL"
  description   = "Read-only Cloud SQL connection for Zeta ${var.environment} business analytics."

  cloud_sql {
    instance_id = var.cloud_sql_instance_connection_name
    database    = var.cloud_sql_database_name
    type        = "POSTGRES"

    credential {
      username = google_sql_user.analytics.name
      password = random_password.analytics_db.result
    }
  }

  depends_on = [google_project_service.bigquery_connection]
}

resource "google_project_iam_member" "connection_cloudsql_client" {
  project = var.project_id
  role    = "roles/cloudsql.client"
  member  = "serviceAccount:${google_bigquery_connection.cloud_sql.cloud_sql[0].service_account_id}"
}

resource "google_service_account" "transfer" {
  project      = var.project_id
  account_id   = "zeta-${var.environment}-analytics-transfer"
  display_name = "Zeta ${title(var.environment)} Analytics Transfer"
  description  = "Runs scheduled BigQuery refreshes for Zeta ${var.environment} business analytics."
}

resource "google_project_iam_member" "transfer_job_user" {
  project = var.project_id
  role    = "roles/bigquery.jobUser"
  member  = "serviceAccount:${google_service_account.transfer.email}"
}

resource "google_service_account_iam_member" "deploy_can_act_as_transfer" {
  count = var.deploy_service_account_email == "" ? 0 : 1

  service_account_id = google_service_account.transfer.name
  role               = "roles/iam.serviceAccountUser"
  member             = "serviceAccount:${var.deploy_service_account_email}"
}

resource "google_bigquery_connection_iam_member" "transfer_connection_user" {
  project       = var.project_id
  location      = var.bigquery_location
  connection_id = google_bigquery_connection.cloud_sql.connection_id
  role          = "roles/bigquery.connectionUser"
  member        = "serviceAccount:${google_service_account.transfer.email}"
}

resource "google_bigquery_dataset_iam_member" "transfer_editor" {
  project    = var.project_id
  dataset_id = google_bigquery_dataset.analytics.dataset_id
  role       = "roles/bigquery.dataEditor"
  member     = "serviceAccount:${google_service_account.transfer.email}"
}

resource "google_project_iam_member" "viewer_project" {
  for_each = local.viewer_project_bindings

  project = var.project_id
  role    = each.value.role
  member  = each.value.member
}

resource "google_bigquery_dataset_iam_member" "viewer_dataset" {
  for_each = local.viewer_dataset_bindings

  project    = var.project_id
  dataset_id = google_bigquery_dataset.analytics.dataset_id
  role       = each.value.role
  member     = each.value.member
}

resource "google_bigquery_table" "video_uploads_daily" {
  project             = var.project_id
  dataset_id          = google_bigquery_dataset.analytics.dataset_id
  table_id            = "business_video_uploads_daily"
  friendly_name       = "Business Video Uploads Daily"
  description         = "Daily aggregate video upload metrics for Looker Studio."
  deletion_protection = var.environment == "prod"
  schema              = local.video_uploads_schema
  clustering          = ["environment", "group_id", "expert_id", "video_status"]
  labels              = local.labels

  time_partitioning {
    type  = "DAY"
    field = "bucket_date"
  }
}

resource "google_bigquery_table" "reviews_daily" {
  project             = var.project_id
  dataset_id          = google_bigquery_dataset.analytics.dataset_id
  table_id            = "business_reviews_daily"
  friendly_name       = "Business Reviews Daily"
  description         = "Daily aggregate review metrics for Looker Studio."
  deletion_protection = var.environment == "prod"
  schema              = local.reviews_schema
  clustering          = ["environment", "group_id", "expert_id"]
  labels              = local.labels

  time_partitioning {
    type  = "DAY"
    field = "bucket_date"
  }
}

resource "google_bigquery_table" "live_coachings_daily" {
  project             = var.project_id
  dataset_id          = google_bigquery_dataset.analytics.dataset_id
  table_id            = "business_live_coachings_daily"
  friendly_name       = "Business Live Coachings Daily"
  description         = "Daily aggregate live coaching metrics for Looker Studio."
  deletion_protection = var.environment == "prod"
  schema              = local.live_coachings_schema
  clustering          = ["environment", "group_id", "expert_id", "status"]
  labels              = local.labels

  time_partitioning {
    type  = "DAY"
    field = "bucket_date"
  }
}

resource "google_bigquery_table" "export_runs" {
  project             = var.project_id
  dataset_id          = google_bigquery_dataset.analytics.dataset_id
  table_id            = "business_analytics_export_runs"
  friendly_name       = "Business Analytics Export Runs"
  description         = "Successful scheduled refresh runs for business analytics."
  deletion_protection = var.environment == "prod"
  schema              = local.export_runs_schema
  clustering          = ["environment", "status"]
  labels              = local.labels

  time_partitioning {
    type  = "DAY"
    field = "started_at"
  }
}

resource "google_bigquery_data_transfer_config" "business_snapshot" {
  project              = var.project_id
  location             = var.bigquery_location
  display_name         = "Zeta ${title(var.environment)} business analytics refresh"
  data_source_id       = "scheduled_query"
  schedule             = var.refresh_schedule
  service_account_name = google_service_account.transfer.email
  disabled             = var.refresh_disabled

  params = {
    query = local.refresh_query
  }

  depends_on = [
    google_project_service.bigquery_data_transfer,
    google_project_iam_member.connection_cloudsql_client,
    google_project_iam_member.transfer_job_user,
    google_service_account_iam_member.deploy_can_act_as_transfer,
    google_bigquery_connection_iam_member.transfer_connection_user,
    google_bigquery_dataset_iam_member.transfer_editor,
    google_bigquery_table.video_uploads_daily,
    google_bigquery_table.reviews_daily,
    google_bigquery_table.live_coachings_daily,
    google_bigquery_table.export_runs,
  ]
}
