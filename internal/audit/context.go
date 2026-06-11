package audit

import (
	"context"
	"net"
	"net/http"
	"strings"

	"github.com/google/uuid"
)

// RequestMeta is the request-scoped context captured for each audit event.
type RequestMeta struct {
	RequestID string
	IP        string
	UserAgent string
}

type ctxKey struct{}

// WithRequestMeta stores request metadata in ctx.
func WithRequestMeta(ctx context.Context, m RequestMeta) context.Context {
	return context.WithValue(ctx, ctxKey{}, m)
}

// requestMetaFrom returns the stored RequestMeta (zero value if absent).
func requestMetaFrom(ctx context.Context) RequestMeta {
	m, _ := ctx.Value(ctxKey{}).(RequestMeta)
	return m
}

// Middleware captures request_id, user-agent and — only when captureIP is true —
// the client IP into the context so the Recorder can attach them to every event
// without per-handler boilerplate. IP is opt-in because it is personal data; the
// caller passes the AUDIT_CAPTURE_IP setting (default off).
func Middleware(captureIP bool) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			requestID := r.Header.Get("X-Request-Id")
			if requestID == "" {
				requestID = uuid.New().String()
			}
			meta := RequestMeta{
				RequestID: requestID,
				UserAgent: r.UserAgent(),
			}
			if captureIP {
				meta.IP = clientIP(r)
			}
			ctx := WithRequestMeta(r.Context(), meta)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

func clientIP(r *http.Request) string {
	if xff := r.Header.Get("X-Forwarded-For"); xff != "" {
		return strings.TrimSpace(strings.Split(xff, ",")[0])
	}
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return r.RemoteAddr
	}
	return host
}
