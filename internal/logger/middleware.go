package logger

import (
	"log/slog"
	"net/http"
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

// Middleware returns an HTTP middleware that logs structured request information.
// It extracts or generates a request ID, attaches a scoped logger to context,
// captures response metadata, and logs a final HTTP request event.
func Middleware(baseLogger *slog.Logger) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// Extract or generate request ID
			requestID := r.Header.Get("X-Request-Id")
			if requestID == "" {
				requestID = uuid.New().String()
			}

			// Create scoped logger with request context
			ctx := With(r.Context(), baseLogger,
				slog.String("request_id", requestID),
				slog.String("method", r.Method),
				slog.String("path", r.URL.Path),
			)

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
