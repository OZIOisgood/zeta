package logger

import (
	"context"
	"fmt"
	"log/slog"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"
)

// ResponseWriter wraps http.ResponseWriter to capture status and bytes written.
type ResponseWriter struct {
	http.ResponseWriter
	statusCode int
	bytes      int
}

func (rw *ResponseWriter) WriteHeader(code int) {
	rw.statusCode = code
	rw.ResponseWriter.WriteHeader(code)
}

func (rw *ResponseWriter) Write(b []byte) (int, error) {
	n, err := rw.ResponseWriter.Write(b)
	rw.bytes += n
	return n, err
}

// Flush implements http.Flusher by delegating to the wrapped ResponseWriter
// when it supports flushing. This keeps Server-Sent Events streaming working
// through the logging middleware.
func (rw *ResponseWriter) Flush() {
	if f, ok := rw.ResponseWriter.(http.Flusher); ok {
		f.Flush()
	}
}

// Unwrap returns the underlying ResponseWriter so http.ResponseController can
// reach optional interfaces the wrapper does not implement.
func (rw *ResponseWriter) Unwrap() http.ResponseWriter {
	return rw.ResponseWriter
}

type requestIDKey struct{}

type cloudTraceContext struct {
	traceID string
	spanID  string
	sampled *bool
}

// WithRequestID stores the request id in ctx so downstream middlewares (e.g.
// audit) reuse the SAME id instead of generating their own.
func WithRequestID(ctx context.Context, id string) context.Context {
	return context.WithValue(ctx, requestIDKey{}, id)
}

// RequestIDFromContext returns the request id set by Middleware ("" if absent).
func RequestIDFromContext(ctx context.Context) string {
	id, _ := ctx.Value(requestIDKey{}).(string)
	return id
}

// Middleware returns an HTTP middleware that logs structured request information.
// It extracts or generates a request ID, attaches a scoped logger to context,
// captures response metadata, and logs a final HTTP request event.
func Middleware(baseLogger *slog.Logger, projectIDs ...string) func(http.Handler) http.Handler {
	projectID := ""
	if len(projectIDs) > 0 {
		projectID = strings.TrimSpace(projectIDs[0])
	}

	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// Extract or generate request ID
			requestID := r.Header.Get("X-Request-Id")
			if requestID == "" {
				requestID = uuid.New().String()
			}

			// Create scoped logger with request context
			attrs := []slog.Attr{
				slog.String("request_id", requestID),
				slog.String("method", r.Method),
				slog.String("path", r.URL.Path),
			}
			if projectID != "" {
				if trace, ok := parseCloudTraceContext(r.Header.Get("X-Cloud-Trace-Context")); ok {
					attrs = append(attrs,
						slog.String("logging.googleapis.com/trace", "projects/"+projectID+"/traces/"+trace.traceID),
					)
					if trace.spanID != "" {
						attrs = append(attrs, slog.String("logging.googleapis.com/spanId", trace.spanID))
					}
					if trace.sampled != nil {
						attrs = append(attrs, slog.Bool("logging.googleapis.com/trace_sampled", *trace.sampled))
					}
				}
			}

			ctx := WithRequestID(r.Context(), requestID)
			ctx = With(ctx, baseLogger, attrs...)

			// Wrap response writer to capture status and bytes
			rw := &ResponseWriter{
				ResponseWriter: w,
				statusCode:     http.StatusOK,
				bytes:          0,
			}

			start := time.Now()
			next.ServeHTTP(rw, r.WithContext(ctx))
			latency := time.Since(start)

			// Log the request completion
			log := From(ctx, baseLogger)
			log.InfoContext(ctx, "http_request",
				slog.Int("status", rw.statusCode),
				slog.Int("bytes", rw.bytes),
				slog.Duration("latency", latency),
			)
		})
	}
}

func parseCloudTraceContext(header string) (cloudTraceContext, bool) {
	header = strings.TrimSpace(header)
	if header == "" {
		return cloudTraceContext{}, false
	}

	traceAndOptions := strings.Split(header, ";")
	traceAndSpan := strings.SplitN(strings.TrimSpace(traceAndOptions[0]), "/", 2)
	traceID := traceAndSpan[0]
	if len(traceID) != 32 {
		return cloudTraceContext{}, false
	}
	if _, err := strconv.ParseUint(traceID[:16], 16, 64); err != nil {
		return cloudTraceContext{}, false
	}
	if _, err := strconv.ParseUint(traceID[16:], 16, 64); err != nil {
		return cloudTraceContext{}, false
	}

	trace := cloudTraceContext{traceID: strings.ToLower(traceID)}
	if len(traceAndSpan) == 2 && strings.TrimSpace(traceAndSpan[1]) != "" {
		spanID, err := strconv.ParseUint(strings.TrimSpace(traceAndSpan[1]), 10, 64)
		if err != nil {
			return cloudTraceContext{}, false
		}
		trace.spanID = fmt.Sprintf("%016x", spanID)
	}

	for _, option := range traceAndOptions[1:] {
		key, value, ok := strings.Cut(strings.TrimSpace(option), "=")
		if !ok || key != "o" {
			continue
		}
		sampled := value == "1"
		trace.sampled = &sampled
		break
	}

	return trace, true
}
