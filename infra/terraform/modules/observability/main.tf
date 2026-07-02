locals {
  title_prefix = "Zeta ${title(var.environment)}"

  api_filter = join(" AND ", [
    "resource.type=\"cloud_run_revision\"",
    "resource.label.\"service_name\"=\"${var.api_service_name}\"",
  ])
  dashboard_filter = join(" AND ", [
    "resource.type=\"cloud_run_revision\"",
    "resource.label.\"service_name\"=\"${var.dashboard_service_name}\"",
  ])
  sql_filter = join(" AND ", [
    "resource.type=\"cloudsql_database\"",
    "resource.label.\"database_id\"=\"${var.project_id}:${var.cloud_sql_instance_name}\"",
  ])

  notification_channels = var.notification_email == "" ? [] : [google_monitoring_notification_channel.email[0].name]
  viewer_roles = toset([
    "roles/errorreporting.viewer",
    "roles/logging.viewer",
    "roles/monitoring.viewer",
    "roles/cloudtrace.user",
  ])
  viewer_bindings = {
    for binding in setproduct(var.viewer_members, local.viewer_roles) :
    "${binding[0]}|${binding[1]}" => {
      member = binding[0]
      role   = binding[1]
    }
  }
}

resource "google_project_iam_member" "observability_viewer" {
  for_each = local.viewer_bindings

  project = var.project_id
  role    = each.value.role
  member  = each.value.member
}

resource "google_monitoring_notification_channel" "email" {
  count = var.notification_email == "" ? 0 : 1

  project      = var.project_id
  display_name = "${local.title_prefix} operators"
  type         = "email"
  labels = {
    email_address = var.notification_email
  }
}

resource "google_monitoring_uptime_check_config" "api" {
  project      = var.project_id
  display_name = "${local.title_prefix} API health"
  timeout      = "10s"
  period       = "60s"
  checker_type = "STATIC_IP_CHECKERS"
  selected_regions = [
    "EUROPE",
    "USA",
    "ASIA_PACIFIC",
  ]

  monitored_resource {
    type = "uptime_url"
    labels = {
      project_id = var.project_id
      host       = var.api_host
    }
  }

  http_check {
    path           = "/health"
    port           = 443
    request_method = "GET"
    use_ssl        = true
    validate_ssl   = true

    accepted_response_status_codes {
      status_class = "STATUS_CLASS_2XX"
    }
  }

  user_labels = {
    environment = var.environment
    service     = "zeta-api"
  }
}

resource "google_monitoring_dashboard" "overview" {
  project = var.project_id
  dashboard_json = jsonencode({
    displayName = "${local.title_prefix} Overview"
    labels = {
      environment = var.environment
    }
    mosaicLayout = {
      columns = 12
      tiles = [
        {
          width  = 3
          height = 2
          widget = {
            title = "API requests / second"
            scorecard = {
              timeSeriesQuery = {
                timeSeriesFilter = {
                  filter = "metric.type=\"run.googleapis.com/request_count\" AND ${local.api_filter}"
                  aggregation = {
                    alignmentPeriod    = "60s"
                    perSeriesAligner   = "ALIGN_RATE"
                    crossSeriesReducer = "REDUCE_SUM"
                  }
                }
              }
            }
          }
        },
        {
          xPos   = 3
          width  = 3
          height = 2
          widget = {
            title = "API 5xx / second"
            scorecard = {
              timeSeriesQuery = {
                timeSeriesFilter = {
                  filter = "metric.type=\"run.googleapis.com/request_count\" AND ${local.api_filter} AND metric.label.\"response_code_class\"=\"5xx\""
                  aggregation = {
                    alignmentPeriod    = "60s"
                    perSeriesAligner   = "ALIGN_RATE"
                    crossSeriesReducer = "REDUCE_SUM"
                  }
                }
              }
            }
          }
        },
        {
          xPos   = 6
          width  = 3
          height = 2
          widget = {
            title = "API p95 latency"
            scorecard = {
              timeSeriesQuery = {
                timeSeriesFilter = {
                  filter = "metric.type=\"run.googleapis.com/request_latencies\" AND ${local.api_filter}"
                  aggregation = {
                    alignmentPeriod    = "60s"
                    perSeriesAligner   = "ALIGN_PERCENTILE_95"
                    crossSeriesReducer = "REDUCE_MAX"
                  }
                }
              }
            }
          }
        },
        {
          xPos   = 9
          width  = 3
          height = 2
          widget = {
            title = "API active instances"
            scorecard = {
              timeSeriesQuery = {
                timeSeriesFilter = {
                  filter = "metric.type=\"run.googleapis.com/container/instance_count\" AND ${local.api_filter}"
                  aggregation = {
                    alignmentPeriod    = "60s"
                    perSeriesAligner   = "ALIGN_MAX"
                    crossSeriesReducer = "REDUCE_SUM"
                  }
                }
              }
            }
          }
        },
        {
          yPos   = 2
          width  = 6
          height = 4
          widget = {
            title = "Requests by response class"
            xyChart = {
              chartOptions = {
                mode = "COLOR"
              }
              dataSets = [{
                plotType       = "LINE"
                targetAxis     = "Y1"
                legendTemplate = "$${metric.labels.response_code_class}"
                timeSeriesQuery = {
                  timeSeriesFilter = {
                    filter = "metric.type=\"run.googleapis.com/request_count\" AND ${local.api_filter}"
                    aggregation = {
                      alignmentPeriod    = "60s"
                      perSeriesAligner   = "ALIGN_RATE"
                      crossSeriesReducer = "REDUCE_SUM"
                      groupByFields      = ["metric.label.\"response_code_class\""]
                    }
                  }
                }
              }]
              yAxis = {
                label = "requests/s"
                scale = "LINEAR"
              }
            }
          }
        },
        {
          xPos   = 6
          yPos   = 2
          width  = 6
          height = 4
          widget = {
            title = "Request latency percentiles"
            xyChart = {
              dataSets = [
                for percentile in [50, 95, 99] : {
                  plotType       = "LINE"
                  targetAxis     = "Y1"
                  legendTemplate = "p${percentile}"
                  timeSeriesQuery = {
                    timeSeriesFilter = {
                      filter = "metric.type=\"run.googleapis.com/request_latencies\" AND ${local.api_filter}"
                      aggregation = {
                        alignmentPeriod    = "60s"
                        perSeriesAligner   = "ALIGN_PERCENTILE_${percentile}"
                        crossSeriesReducer = "REDUCE_MAX"
                      }
                    }
                  }
                }
              ]
              yAxis = {
                label = "latency"
                scale = "LINEAR"
              }
            }
          }
        },
        {
          yPos   = 6
          width  = 6
          height = 4
          widget = {
            title = "Cloud Run CPU and memory"
            xyChart = {
              dataSets = [
                for signal in [
                  { name = "CPU", metric = "run.googleapis.com/container/cpu/utilizations" },
                  { name = "Memory", metric = "run.googleapis.com/container/memory/utilizations" },
                  ] : {
                  plotType       = "LINE"
                  targetAxis     = "Y1"
                  legendTemplate = signal.name
                  timeSeriesQuery = {
                    timeSeriesFilter = {
                      filter = "metric.type=\"${signal.metric}\" AND ${local.api_filter}"
                      aggregation = {
                        alignmentPeriod    = "60s"
                        perSeriesAligner   = "ALIGN_PERCENTILE_95"
                        crossSeriesReducer = "REDUCE_MAX"
                      }
                    }
                  }
                }
              ]
              thresholds = [{
                value = 0.85
              }]
              yAxis = {
                label = "utilization"
                scale = "LINEAR"
              }
            }
          }
        },
        {
          xPos   = 6
          yPos   = 6
          width  = 6
          height = 4
          widget = {
            title = "Cloud Run capacity and billable time"
            xyChart = {
              dataSets = [
                {
                  plotType       = "LINE"
                  targetAxis     = "Y1"
                  legendTemplate = "instances"
                  timeSeriesQuery = {
                    timeSeriesFilter = {
                      filter = "metric.type=\"run.googleapis.com/container/instance_count\" AND ${local.api_filter}"
                      aggregation = {
                        alignmentPeriod    = "60s"
                        perSeriesAligner   = "ALIGN_MAX"
                        crossSeriesReducer = "REDUCE_SUM"
                      }
                    }
                  }
                },
                {
                  plotType       = "LINE"
                  targetAxis     = "Y1"
                  legendTemplate = "billable seconds/min"
                  timeSeriesQuery = {
                    timeSeriesFilter = {
                      filter = "metric.type=\"run.googleapis.com/container/billable_instance_time\" AND ${local.api_filter}"
                      aggregation = {
                        alignmentPeriod    = "60s"
                        perSeriesAligner   = "ALIGN_SUM"
                        crossSeriesReducer = "REDUCE_SUM"
                      }
                    }
                  }
                },
              ]
              yAxis = {
                label = "instances / seconds"
                scale = "LINEAR"
              }
            }
          }
        },
        {
          yPos   = 10
          width  = 12
          height = 4
          widget = {
            title = "Cloud SQL health"
            xyChart = {
              dataSets = [
                for signal in [
                  { name = "CPU utilization", metric = "cloudsql.googleapis.com/database/cpu/utilization", aligner = "ALIGN_MEAN" },
                  { name = "Disk utilization", metric = "cloudsql.googleapis.com/database/disk/utilization", aligner = "ALIGN_MEAN" },
                  { name = "Connections", metric = "cloudsql.googleapis.com/database/network/connections", aligner = "ALIGN_MAX" },
                  ] : {
                  plotType       = "LINE"
                  targetAxis     = "Y1"
                  legendTemplate = signal.name
                  timeSeriesQuery = {
                    timeSeriesFilter = {
                      filter = "metric.type=\"${signal.metric}\" AND ${local.sql_filter}"
                      aggregation = {
                        alignmentPeriod    = "60s"
                        perSeriesAligner   = signal.aligner
                        crossSeriesReducer = "REDUCE_MAX"
                      }
                    }
                  }
                }
              ]
              yAxis = {
                label = "value"
                scale = "LINEAR"
              }
            }
          }
        },
        {
          yPos   = 14
          width  = 6
          height = 5
          widget = {
            title = "Recent API errors"
            logsPanel = {
              filter = join("\n", [
                "resource.type=\"cloud_run_revision\"",
                "resource.labels.service_name=\"${var.api_service_name}\"",
                "severity>=ERROR",
              ])
              resourceNames = ["projects/${var.project_id}"]
            }
          }
        },
        {
          xPos   = 6
          yPos   = 14
          width  = 6
          height = 5
          widget = {
            title = "Operational integration warnings"
            logsPanel = {
              filter = join("\n", [
                "resource.type=\"cloud_run_revision\"",
                "resource.labels.service_name=\"${var.api_service_name}\"",
                "severity>=WARNING",
                "jsonPayload.component=(\"coaching\" OR \"email_service\" OR \"inbound_email\" OR \"llm\" OR \"notifications\")",
              ])
              resourceNames = ["projects/${var.project_id}"]
            }
          }
        },
      ]
    }
  })
}

resource "google_monitoring_alert_policy" "api_uptime" {
  project      = var.project_id
  display_name = "${local.title_prefix}: API unavailable"
  combiner     = "OR"
  enabled      = true

  conditions {
    display_name = "Health check fails in most regions"
    condition_threshold {
      filter          = "resource.type=\"uptime_url\" AND metric.type=\"monitoring.googleapis.com/uptime_check/check_passed\" AND metric.label.\"check_id\"=\"${google_monitoring_uptime_check_config.api.uptime_check_id}\""
      comparison      = "COMPARISON_LT"
      threshold_value = 0.5
      duration        = "120s"

      aggregations {
        alignment_period     = "60s"
        per_series_aligner   = "ALIGN_FRACTION_TRUE"
        cross_series_reducer = "REDUCE_MEAN"
        group_by_fields      = ["metric.label.\"check_id\""]
      }
    }
  }

  notification_channels = local.notification_channels
  documentation {
    subject   = "${local.title_prefix} API health check is failing"
    mime_type = "text/markdown"
    content   = "Check the [overview dashboard](https://console.cloud.google.com/monitoring/dashboards?project=${var.project_id}) and Cloud Run revision health. The check targets `https://${var.api_host}/health`."
  }
  alert_strategy {
    auto_close = "1800s"
  }
  user_labels = {
    environment = var.environment
    severity    = "warning"
  }
}

resource "google_monitoring_alert_policy" "api_5xx" {
  project      = var.project_id
  display_name = "${local.title_prefix}: elevated API 5xx rate"
  combiner     = "AND_WITH_MATCHING_RESOURCE"
  enabled      = true

  conditions {
    display_name = "5xx ratio exceeds 5 percent"
    condition_threshold {
      filter             = "metric.type=\"run.googleapis.com/request_count\" AND ${local.api_filter} AND metric.label.\"response_code_class\"=\"5xx\""
      denominator_filter = "metric.type=\"run.googleapis.com/request_count\" AND ${local.api_filter}"
      comparison         = "COMPARISON_GT"
      threshold_value    = 0.05
      duration           = "300s"

      aggregations {
        alignment_period     = "300s"
        per_series_aligner   = "ALIGN_RATE"
        cross_series_reducer = "REDUCE_SUM"
        group_by_fields      = ["resource.label.\"service_name\""]
      }
      denominator_aggregations {
        alignment_period     = "300s"
        per_series_aligner   = "ALIGN_RATE"
        cross_series_reducer = "REDUCE_SUM"
        group_by_fields      = ["resource.label.\"service_name\""]
      }
    }
  }

  conditions {
    display_name = "At least five requests in five minutes"
    condition_threshold {
      filter          = "metric.type=\"run.googleapis.com/request_count\" AND ${local.api_filter}"
      comparison      = "COMPARISON_GT"
      threshold_value = 0.0166
      duration        = "300s"

      aggregations {
        alignment_period     = "300s"
        per_series_aligner   = "ALIGN_RATE"
        cross_series_reducer = "REDUCE_SUM"
        group_by_fields      = ["resource.label.\"service_name\""]
      }
    }
  }

  notification_channels = local.notification_channels
  documentation {
    subject   = "${local.title_prefix} API is returning elevated 5xx responses"
    mime_type = "text/markdown"
    content   = "Open the Zeta overview, compare the active Cloud Run revision, then inspect ERROR logs and the correlated trace."
  }
  alert_strategy {
    auto_close = "1800s"
  }
  user_labels = {
    environment = var.environment
    severity    = "warning"
  }
}

resource "google_monitoring_alert_policy" "api_latency" {
  project      = var.project_id
  display_name = "${local.title_prefix}: high API p95 latency"
  combiner     = "OR"
  enabled      = true

  conditions {
    display_name = "p95 latency exceeds two seconds"
    condition_threshold {
      filter          = "metric.type=\"run.googleapis.com/request_latencies\" AND ${local.api_filter}"
      comparison      = "COMPARISON_GT"
      threshold_value = 2000
      duration        = "600s"

      aggregations {
        alignment_period     = "600s"
        per_series_aligner   = "ALIGN_PERCENTILE_95"
        cross_series_reducer = "REDUCE_MAX"
        group_by_fields      = ["resource.label.\"service_name\""]
      }
    }
  }

  notification_channels = local.notification_channels
  documentation {
    subject   = "${local.title_prefix} API p95 latency is over two seconds"
    mime_type = "text/markdown"
    content   = "Check request latency, CPU/memory, Cloud SQL, and traces on the Zeta overview before changing Cloud Run capacity."
  }
  alert_strategy {
    auto_close = "1800s"
  }
  user_labels = {
    environment = var.environment
    severity    = "warning"
  }
}

resource "google_monitoring_alert_policy" "api_memory" {
  project      = var.project_id
  display_name = "${local.title_prefix}: high API memory utilization"
  combiner     = "OR"
  enabled      = true

  conditions {
    display_name = "Memory utilization exceeds 85 percent"
    condition_threshold {
      filter          = "metric.type=\"run.googleapis.com/container/memory/utilizations\" AND ${local.api_filter}"
      comparison      = "COMPARISON_GT"
      threshold_value = 0.85
      duration        = "600s"

      aggregations {
        alignment_period     = "600s"
        per_series_aligner   = "ALIGN_PERCENTILE_95"
        cross_series_reducer = "REDUCE_MAX"
        group_by_fields      = ["resource.label.\"service_name\""]
      }
    }
  }

  notification_channels = local.notification_channels
  documentation {
    subject   = "${local.title_prefix} API memory utilization is high"
    mime_type = "text/markdown"
    content   = "Inspect the active revision, request volume, instance count, and memory chart before increasing the memory limit."
  }
  alert_strategy {
    auto_close = "1800s"
  }
  user_labels = {
    environment = var.environment
    severity    = "warning"
  }
}

resource "google_monitoring_alert_policy" "sql_disk" {
  project      = var.project_id
  display_name = "${local.title_prefix}: Cloud SQL disk utilization high"
  combiner     = "OR"
  enabled      = true

  conditions {
    display_name = "Disk utilization exceeds 80 percent"
    condition_threshold {
      filter          = "metric.type=\"cloudsql.googleapis.com/database/disk/utilization\" AND ${local.sql_filter}"
      comparison      = "COMPARISON_GT"
      threshold_value = 0.8
      duration        = "300s"

      aggregations {
        alignment_period   = "300s"
        per_series_aligner = "ALIGN_MEAN"
      }
    }
  }

  notification_channels = local.notification_channels
  documentation {
    subject   = "${local.title_prefix} Cloud SQL disk utilization is above 80 percent"
    mime_type = "text/markdown"
    content   = "Inspect Cloud SQL storage growth and free space. Confirm backups and retention before deleting data or resizing storage."
  }
  alert_strategy {
    auto_close = "3600s"
  }
  user_labels = {
    environment = var.environment
    severity    = "warning"
  }
}

resource "google_monitoring_alert_policy" "critical_application_log" {
  project      = var.project_id
  display_name = "${local.title_prefix}: critical application workflow failure"
  combiner     = "OR"
  enabled      = true

  conditions {
    display_name = "Critical workflow error log"
    condition_matched_log {
      filter = join("\n", [
        "resource.type=\"cloud_run_revision\"",
        "resource.labels.service_name=\"${var.api_service_name}\"",
        "severity>=ERROR",
        "jsonPayload.message=(\"inbound_email_webhook_persist_failed\" OR \"recording_import_process_failed\" OR \"recording_import_cleanup_process_failed\" OR \"audit_ensure_partitions_failed\" OR \"api_listen_failed\")",
      ])
    }
  }

  notification_channels = local.notification_channels
  documentation {
    subject   = "${local.title_prefix} critical application workflow failed"
    mime_type = "text/markdown"
    content   = "Open the matching log entry, follow its request ID or trace, and inspect the component-specific context. Do not retry non-idempotent work manually until persistence state is known."
  }
  alert_strategy {
    notification_rate_limit {
      period = "900s"
    }
    auto_close = "1800s"
  }
  user_labels = {
    environment = var.environment
    severity    = "warning"
  }
}
