locals {
  bucket_name = "${var.project_id}-zeta-${var.environment}-coaching-recordings"
}

resource "google_storage_bucket" "recordings" {
  project                     = var.project_id
  name                        = local.bucket_name
  location                    = upper(var.region)
  uniform_bucket_level_access = true
  public_access_prevention    = "enforced"
  force_destroy               = var.force_destroy

  labels = {
    app         = "zeta"
    environment = var.environment
    purpose     = "agora-recordings"
  }
}

resource "google_service_account" "agora_recording_storage" {
  project      = var.project_id
  account_id   = "zeta-agora-rec-${var.environment}"
  display_name = "Zeta Agora Recording Storage (${var.environment})"
  description  = "Service account used by Agora Cloud Recording to write recordings to GCS."
}

resource "google_storage_bucket_iam_member" "agora_recording_storage_admin" {
  bucket = google_storage_bucket.recordings.name
  role   = "roles/storage.admin"
  member = "serviceAccount:${google_service_account.agora_recording_storage.email}"
}

resource "google_storage_hmac_key" "agora_recording_storage" {
  service_account_email = google_service_account.agora_recording_storage.email

  depends_on = [google_storage_bucket_iam_member.agora_recording_storage_admin]
}

resource "google_secret_manager_secret" "agora_recording_storage_access_key" {
  project   = var.project_id
  secret_id = "zeta-${var.environment}-agora-recording-storage-access-key"

  replication {
    auto {}
  }
}

resource "google_secret_manager_secret_version" "agora_recording_storage_access_key" {
  secret      = google_secret_manager_secret.agora_recording_storage_access_key.id
  secret_data = google_storage_hmac_key.agora_recording_storage.access_id
}

resource "google_secret_manager_secret" "agora_recording_storage_secret_key" {
  project   = var.project_id
  secret_id = "zeta-${var.environment}-agora-recording-storage-secret-key"

  replication {
    auto {}
  }
}

resource "google_secret_manager_secret_version" "agora_recording_storage_secret_key" {
  secret      = google_secret_manager_secret.agora_recording_storage_secret_key.id
  secret_data = google_storage_hmac_key.agora_recording_storage.secret
}
