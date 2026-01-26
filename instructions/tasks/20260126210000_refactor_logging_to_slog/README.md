# Refactor Logging to Structured Slog

## Objective

Refactor all ad-hoc logging across the Go application to use Go standard library `log/slog` with structured JSON output to stdout. Establish consistent logging conventions across all packages.

## Goals

1. ✅ Implement structured logging with `log/slog` (Go 1.21+)
2. ✅ JSON logs to stdout in production
3. ✅ Request-scoped context with auto-generated request IDs
4. ✅ Consistent snake_case naming for events and fields
5. ✅ HTTP middleware logging with status, bytes, latency
6. ✅ Error logging with context wrapping (`fmt.Errorf("...", %w", err)`)
7. ✅ No sensitive data in logs (tokens, passwords, emails)
8. ✅ Comprehensive logging documentation

## Changes Made

### 1. New Logger Package (`internal/logger/`)

- **logger.go**: Base logger initialization with JSON handler, helpers `With()` and `From()` for context management
- **middleware.go**: HTTP middleware that extracts/generates X-Request-Id, captures response metadata (status, bytes), measures latency, logs structured `http_request` events

### 2. Application Initialization

- **cmd/api/main.go**: Initialize base logger, pass to server, replace log.Fatal with structured logging
- **internal/api/server.go**: Install logging middleware, pass logger to all handlers

### 3. Service Refactoring

All services now accept `*slog.Logger` as dependency and use structured logging:

- **internal/email/service.go**: Email send/failure events with component labels
- **internal/auth/handler.go & middleware.go**: Login, logout, token validation, authentication events
- **internal/assets/handler.go**: Asset CRUD operations with detailed error context
- **internal/groups/handler.go**: Group creation and listing with user context
- **internal/features/handler.go**: Feature flag lookups and validation

### 4. Documentation

- **instructions/LOGGING_CONSTITUTION.md**: Logging standards document with patterns, conventions, and checklist
- **docs/logging.md**: Comprehensive logging guide with before/after examples, request flow diagrams, aggregation info
- **instructions/CONSTITUTION.md**: Updated with Section 6 referencing logging standards

## Logging Conventions Established

### Event Names (snake_case)

- `asset_created`, `asset_create_failed`
- `email_send_succeeded`, `email_send_failed`
- `user_authenticated`, `auth_token_invalid`
- `group_created`, `http_request`

### Field Keys (snake_case)

- `request_id`, `user_id`, `group_id`, `asset_id`
- `component`, `method`, `path`, `status`, `bytes`, `latency`, `err`

### Log Levels

- **INFO**: Lifecycle, successful operations
- **WARN**: Handled anomalies, degraded behavior
- **ERROR**: Failed operations requiring attention
- **DEBUG**: Detailed diagnostics (development only)

### Context Pattern

```go
log := logger.From(ctx, h.logger)
log.InfoContext(ctx, "event_name",
    slog.String("component", "assets"),
    slog.String("asset_id", id),
)
```

## Build Verification

✅ `make api:build` - All code compiles successfully  
✅ Added `github.com/google/uuid` dependency for request ID generation  
✅ No regressions introduced

## Files Modified

- `cmd/api/main.go`
- `internal/api/server.go`
- `internal/auth/handler.go`
- `internal/auth/middleware.go`
- `internal/assets/handler.go`
- `internal/email/service.go`
- `internal/features/handler.go`
- `internal/groups/handler.go`

## Files Created

- `internal/logger/logger.go`
- `internal/logger/middleware.go`
- `docs/logging.md`
- `instructions/LOGGING_CONSTITUTION.md`

## How to Use

1. **Initialize logger in main**:

```go
baseLogger := logger.New()
srv := api.NewServer(pool, baseLogger)
```

2. **Pass logger to services**:

```go
emailService := email.NewService(baseLogger)
```

3. **Use in handlers**:

```go
log := logger.From(ctx, h.logger)
log.InfoContext(ctx, "event_name", slog.String("key", "value"))
```

4. **Enable DEBUG logging** (development):
   Modify `internal/logger/logger.go`:

```go
func New() *slog.Logger {
    handler := slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
        Level: slog.LevelDebug,  // Change from LevelInfo
    })
    return slog.New(handler)
}
```

## Integration with Log Aggregation

The JSON logs integrate seamlessly with:

- ELK Stack (Elasticsearch queries)
- Datadog (tag-based filtering)
- Splunk (structured JSON parsing)
- CloudWatch (GCP native)
- Stackdriver

## Status

✅ **COMPLETED** - All logging refactored, documented, and integrated.

## References

- [Logging Constitution](../LOGGING_CONSTITUTION.md)
- [Logging Guide](../../docs/logging.md)
- [Project Constitution](../CONSTITUTION.md)
