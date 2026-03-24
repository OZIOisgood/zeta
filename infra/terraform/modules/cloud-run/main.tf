resource "google_cloud_run_v2_service" "app" {
  name                = var.service_name
  location            = var.region
  project             = var.project_id
  deletion_protection = false

  template {
    scaling {
      min_instance_count = var.min_instances
      max_instance_count = var.max_instances
    }

    containers {
      # Initial placeholder; the deploy workflow overrides the image via gcloud.
      image = "us-docker.pkg.dev/cloudrun/container/hello"

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
    # The deploy workflow sets the image, env vars, secrets, volumes, and client
    # metadata via gcloud. Terraform only manages the service skeleton + scaling.
    ignore_changes = [
      template[0].containers,
      template[0].volumes,
      client,
      client_version,
    ]
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
