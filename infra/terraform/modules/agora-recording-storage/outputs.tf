output "bucket_name" {
  value = google_storage_bucket.recordings.name
}

output "storage_vendor" {
  value = 6
}

output "storage_region" {
  value = 0
}

output "access_key_secret_id" {
  value = google_secret_manager_secret.agora_recording_storage_access_key.secret_id
}

output "secret_key_secret_id" {
  value = google_secret_manager_secret.agora_recording_storage_secret_key.secret_id
}
