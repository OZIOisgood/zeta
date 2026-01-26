# Logging Constitution

This document establishes logging standards for the Zeta project to ensure consistent, structured, and queryable logs across all services.

## 1. Logging Framework

- **Library**: Go standard library `log/slog` (Go 1.21+)
- **Format**: JSON to stdout
- **Configuration**: `LOG_LEVEL` environment variable (debug, info, warn, error). Defaults to INFO.
- **Handler**: `slog.NewJSONHandler` with configurable level.

For comprehensive guide, see [docs/logging.md](../../docs/logging.md)

## 2. Logger Initialization & Dependency Injection

Every service that needs to log must accept a `*slog.Logger` as a dependency:

```go
// ✓ Correct: Logger as dependency
type Handler struct {
    logger *slog.Logger
}

func NewHandler(logger *slog.Logger) *Handler {
    return &Handler{logger: logger}
}

// ✗ Wrong: Using package-level logger or no logger
type Handler struct{}
```

- Create base logger in `cmd/api/main.go` via `logger.New()`
- Pass to `api.NewServer(pool, baseLogger)`
- Handlers receive logger in constructors

## 3. Request-Scoped Logging

Every handler must retrieve the scoped logger from request context:

```go
func (h *Handler) HandleRequest(w http.ResponseWriter, r *http.Request) {
    ctx := r.Context()
    log := logger.From(ctx, h.logger)

    log.InfoContext(ctx, "event_name", slog.String("key", "value"))
}
```

The HTTP middleware (`internal/logger/middleware.go`) automatically:

- Extracts or generates `X-Request-Id`
- Attaches scoped logger with request context to ctx
- Logs `http_request` event at end with status, bytes, latency

## 4. Naming Conventions

### Event Names (snake_case, stable)

Machine-readable event identifiers follow the pattern `{noun}_{verb}` or `{noun}_{state}`:

- `asset_created` - Asset successfully created
- `asset_create_failed` - Asset creation failed
- `email_send_succeeded` - Email sent successfully
- `email_send_failed` - Email send failed
- `user_authenticated` - User authentication succeeded
- `auth_token_invalid` - Authentication token validation failed
- `group_created` - Group successfully created
- `http_request` - HTTP request completed (logged by middleware)

### Key Names (snake_case, consistent)

Always use consistent field names across the codebase:

| Field        | Usage                            |
| ------------ | -------------------------------- |
| `request_id` | Unique request identifier        |
| `user_id`    | User entity ID                   |
| `group_id`   | Group entity ID                  |
| `asset_id`   | Asset entity ID                  |
| `component`  | Service/package name             |
| `method`     | HTTP method (GET, POST, etc.)    |
| `path`       | HTTP path                        |
| `status`     | HTTP status code                 |
| `bytes`      | Bytes written in response        |
| `latency`    | Request duration                 |
| `err`        | Error object (always for errors) |

## 5. Log Levels

| Level     | Purpose                                                   |
| --------- | --------------------------------------------------------- |
| **INFO**  | Lifecycle events, successful operations, state changes    |
| **WARN**  | Handled anomalies, degraded behavior, non-fatal issues    |
| **ERROR** | Failed operations, exceptions, errors requiring attention |
| **DEBUG** | Detailed diagnostic info (development only)               |

**Never use ERROR for business logic validation** - use WARN or INFO instead.

## 6. Error Logging Pattern

Always log errors with context and wrap errors on return:

```go
// ✓ Correct pattern
result, err := h.q.CreateAsset(ctx, params)
if err != nil {
    log.ErrorContext(ctx, "asset_create_failed",
        slog.String("component", "assets"),
        slog.String("user_id", userID),
        slog.Any("err", err),
    )
    return fmt.Errorf("create asset: %w", err)  // Wrap with context
}
```

## 7. Sensitive Data & Redaction

**Never log:**

- Authorization headers or cookies
- Tokens, passwords, or API keys
- Full email bodies
- Raw PII (email addresses as values - use IDs instead)
- Complete request/response bodies

**Safe to log:**

- User IDs (not emails)
- Resource IDs (group_id, asset_id)
- HTTP method, path, status
- Operation results and counts

## 8. Background Operations

For operations running in goroutines (e.g., async notifications):

```go
go func() {
    bgCtx := context.Background()
    bgLog := h.logger.With(
        slog.String("component", "assets"),
        slog.String("asset_id", assetID),
    )

    bgLog.InfoContext(bgCtx, "notification_sent", slog.String("email_id", emailID))
}()
```

**Do not reuse parent context in background goroutines** - they may outlive the request.

## 9. Common Error Scenarios

### Database Errors

```go
log.ErrorContext(ctx, "asset_list_failed",
    slog.String("component", "assets"),
    slog.Any("err", err),
)
```

### Validation Errors (WARN, not ERROR)

```go
log.WarnContext(ctx, "asset_create_invalid_group",
    slog.String("component", "assets"),
    slog.String("user_id", userID),
)
```

### Feature Flags Disabled (DEBUG)

```go
log.DebugContext(ctx, "feature_disabled",
    slog.String("component", "features"),
    slog.String("feature", "create-asset"),
)
```

## 10. Summary Checklist

Before submitting a PR:

- [ ] All services accept `*slog.Logger` as dependency
- [ ] Handlers use `logger.From(ctx, h.logger)` to get scoped logger
- [ ] Event names are snake_case and stable
- [ ] Field keys are snake_case and consistent
- [ ] Errors always logged with `err` field
- [ ] Errors wrapped with context on return
- [ ] No sensitive data in logs
- [ ] Background goroutines use `context.Background()`
- [ ] Log levels appropriate (DEBUG < INFO < WARN < ERROR)
- [ ] `component` field included in all logs from that service

## 11. Reference

- Comprehensive guide: [docs/logging.md](../../docs/logging.md)
- Logger package: [internal/logger/](../../internal/logger/)
- Examples:
  - Email: [internal/email/service.go](../../internal/email/service.go)
  - Assets: [internal/assets/handler.go](../../internal/assets/handler.go)
  - Auth: [internal/auth/middleware.go](../../internal/auth/middleware.go)
  - Groups: [internal/groups/handler.go](../../internal/groups/handler.go)
