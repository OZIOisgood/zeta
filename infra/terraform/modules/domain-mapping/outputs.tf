output "dns_records" {
  description = "DNS records that must be configured at the domain registrar"
  value       = google_cloud_run_domain_mapping.this.status[0].resource_records
}
