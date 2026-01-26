# Structured Logging Guide

This application uses Go's standard library `log/slog` (Go 1.21+) for structured JSON logging. All logs are emitted to stdout as JSON objects, making them suitable for production environments and log aggregation systems.

## Overview

- **Format**: JSON to stdout
- **Default Level**: INFO
- **Context**: All logs include request-scoped information (request_id, method, path)
- **Convention**: snake_case keys, stable event names, error handling with `err` field

## Key Concepts

### 1. Logger Initialization

The base logger is created in `cmd/api/main.go`. It reads the `LOG_LEVEL` environment variable (default: INFO) to determine verbosity:

```go
logLevel := tools.GetEnvOrDefault("LOG_LEVEL", "info")
baseLogger := logger.NewWithLevel(logger.ParseLevel(logLevel))
```

This creates a `*slog.Logger` with `slog.NewJSONHandler` outputting to stdout.

### 2. Configuration

You can control the log level via the `LOG_LEVEL` environment variable:

- `LOG_LEVEL=debug` - Enable debug logs
- `LOG_LEVEL=info` - Default production level
- `LOG_LEVEL=warn` - Warnings and errors only
- `LOG_LEVEL=error` - Errors only

### 3. Request-Scoped Logging

The HTTP middleware (`internal/logger/middleware.go`) automatically:

- Extracts or generates a unique `X-Request-Id`
- Attaches a scoped logger to the request context
- Captures response status and bytes written
- Logs HTTP request completion with latency

Retrieve the scoped logger from context in handlers:

```go
log := logger.From(ctx, h.logger)
log.InfoContext(ctx, "event_name", slog.String("key", "value"))
```

### 3. Log Levels

- **INFO**: Lifecycle events, successful operations, state changes
- **WARN**: Handled anomalies, degraded behavior, non-fatal issues
- **ERROR**: Failed operations, exceptions, errors requiring attention
- **DEBUG**: Detailed diagnostic info (not logged by default in production)

## Naming Conventions

### Event Names (snake_case)

Stable, machine-readable names for log events:

- `http_request` - HTTP request completion
- `asset_created` - Asset successfully created
- `asset_create_failed` - Asset creation error
- `email_send_succeeded` - Email sent successfully
- `email_send_failed` - Email send error
- `user_authenticated` - User auth succeeded
- `auth_token_invalid` - Authentication token invalid
- `group_created` - Group successfully created

**Pattern**: `{noun}_{verb}` or `{noun}_{state}`

### Key Names (snake_case)

Consistent, descriptive field names:

- `request_id` - Unique request identifier
- `user_id` - User identifier
- `group_id` - Group identifier
- `asset_id` - Asset identifier
- `component` - Service/package name
- `method` - HTTP method (GET, POST, etc.)
- `path` - HTTP path
- `status` - HTTP status code
- `bytes` - Bytes written in response
- `latency` - Duration, formatted as "123ms" or similar
- `err` - Error object (always used for errors)
- `email_id` - Resend email ID

## Examples

### Before (Ad-hoc Logging)

```go
// Old style with bracketed prefixes
fmt.Printf("[Email Service] Preparing to send email to %v\n", to)
fmt.Printf("[Email Service] Failed to send email: %v\n", err)
fmt.Printf("[Email Notification] Error fetching group: %v\n", err)
fmt.Println("[Email Notification] Uploader is the owner, skipping.")
```

### After (Structured Logging)

```go
// New style with slog
log.Info("email_send_initiated",
    slog.String("component", "email_service"),
    slog.Any("to", to),
    slog.String("subject", subject),
)

log.Error("email_send_failed",
    slog.String("component", "email_service"),
    slog.Any("err", err),
    slog.Any("to", to),
)

log.Error("asset_notification_group_fetch_failed",
    slog.String("component", "assets"),
    slog.String("asset_id", assetID),
    slog.Any("err", err),
)

log.Debug("asset_uploader_is_owner_skip_notification",
    slog.String("component", "assets"),
    slog.String("owner_id", ownerID),
)
```

## Request Logging Example

When a user creates an asset, here's what gets logged:

1. **HTTP request logged by middleware** (at end of request):

```json
{
  "time": "2026-01-26T12:34:56.789Z",
  "level": "INFO",
  "msg": "http_request",
  "request_id": "550e8400-e29b-41d4-a716-446655440000",
  "method": "POST",
  "path": "/assets",
  "status": 200,
  "bytes": 1024,
  "latency": "145ms"
}
```

2. **Component logs during request** (asset creation):

```json
{
  "time": "2026-01-26T12:34:56.123Z",
  "level": "INFO",
  "msg": "asset_created",
  "request_id": "550e8400-e29b-41d4-a716-446655440000",
  "component": "assets",
  "user_id": "user_123",
  "asset_id": "asset_456",
  "group_id": "group_789"
}
```

3. **Error during email notification** (background goroutine):

```json
{
  "time": "2026-01-26T12:34:57.456Z",
  "level": "ERROR",
  "msg": "asset_notification_send_failed",
  "component": "assets",
  "asset_id": "asset_456",
  "owner_id": "owner_123",
  "err": "send email: connection timeout"
}
```

## Error Logging Pattern

Always include the `err` field when logging errors, and wrap errors with context:

```go
err := h.q.CreateAsset(ctx, params)
if err != nil {
    log.ErrorContext(ctx, "asset_create_failed",
        slog.String("component", "assets"),
        slog.String("user_id", userID),
        slog.Any("err", err),
    )
    http.Error(w, "Failed to create asset", http.StatusInternalServerError)
    return fmt.Errorf("create asset: %w", err)  // Wrap with context on return
}
```

## Sensitive Data & Redaction

**Never log:**

- Authorization headers
- Cookies or tokens
- Passwords or secrets
- Full email bodies
- Raw PII (email addresses in log body) - use IDs instead
- API keys or credentials

**Do log:**

- User IDs (not emails)
- Truncated resource identifiers
- Operation results (success/failure, counts)
- Non-sensitive request metadata (method, path, status)

Example:

```go
// ❌ DON'T DO THIS
log.Info("user_login", slog.String("email", user.Email))

// ✅ DO THIS
log.Info("user_login", slog.String("user_id", user.ID))

// ❌ DON'T DO THIS
log.Error("send_email_failed", slog.String("body", emailBody))

// ✅ DO THIS
log.Error("email_send_failed", slog.Any("err", err))
```

## Background Operations

For operations that run in goroutines (like email notifications), create a new context and logger with component information:

```go
go func() {
    bgCtx := context.Background()
    bgLog := h.logger.With(
        slog.String("component", "assets"),
        slog.String("asset_id", assetID),
    )

    // Use bgLog and bgCtx for this background work
    bgLog.InfoContext(bgCtx, "email_sent", slog.String("email_id", id))
}()
```

## Log Aggregation

These structured JSON logs work well with log aggregation systems:

- **ELK Stack** (Elasticsearch, Logstash, Kibana)
- **Datadog**
- **Splunk**
- **CloudWatch**
- **Stackdriver**

Each log entry is automatically JSON-formatted and includes all context fields for easy querying and filtering.

### Example Queries

**Find all asset creation errors:**

```
msg:"asset_create_failed"
```

**Find slow requests:**

```
msg:"http_request" AND latency > 1000ms
```

**Find email failures for a user:**

```
user_id:"user_123" AND msg:"email_send_failed"
```

## Testing & Debugging

To enable DEBUG-level logging for local development, modify `internal/logger/logger.go`:

```go
func New() *slog.Logger {
    handler := slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
        Level: slog.LevelDebug,  // Change from LevelInfo
    })
    return slog.New(handler)
}
```

Or use `NewWithLevel`:

```go
logger := logger.NewWithLevel(slog.LevelDebug)
```

## Summary

1. Always use request-scoped logger: `log := logger.From(ctx, h.logger)`
2. Use structured fields with snake_case keys
3. Use stable, descriptive event names
4. Always log errors with `err` field
5. Never log sensitive data (secrets, passwords, email bodies)
6. Use INFO for lifecycle, WARN for anomalies, ERROR for failures
7. HTTP middleware automatically logs request completion with latency
