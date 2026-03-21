resource "google_cloud_run_v2_service" "app" {
  name     = "zeta-api"
  location = var.region
  project  = var.project_id

  template {
    scaling {
      min_instance_count = var.min_instances
      max_instance_count = var.max_instances
    }

    containers {
      image = var.image

      resources {
        limits = {
          memory = var.memory
          cpu    = var.cpu
        }
        cpu_idle = true
      }

      # Application secrets are injected via gcloud CLI during deployment.
      # See deploy-dev.yml and deploy-prod.yml --set-secrets flags.
    }
  }

  lifecycle {
    # Prevent Terraform from overwriting the image set by the deploy workflow.
    ignore_changes = [template[0].containers[0].image]
  }
}

# Allow unauthenticated public access to the service.
resource "google_cloud_run_v2_service_iam_member" "public" {
  name     = google_cloud_run_v2_service.app.name
  location = google_cloud_run_v2_service.app.location
  project  = var.project_id
  role     = "roles/run.invoker"
  member   = "allUsers"
}
