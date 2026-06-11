package audit

import (
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/OZIOisgood/zeta/internal/logger"
)

func TestClientIP_UsesRightmostXFF(t *testing.T) {
	r := httptest.NewRequest(http.MethodGet, "/", nil)
	// Leftmost entries are client-supplied and forgeable; the trusted proxy
	// (Cloud Run / GFE) appends the real client IP as the rightmost entry.
	r.Header.Set("X-Forwarded-For", "6.6.6.6, 198.51.100.9, 203.0.113.7")
	if got := clientIP(r); got != "203.0.113.7" {
		t.Errorf("clientIP = %q, want 203.0.113.7 (rightmost)", got)
	}
}

func TestClientIP_FallsBackToRemoteAddr(t *testing.T) {
	r := httptest.NewRequest(http.MethodGet, "/", nil) // RemoteAddr = 192.0.2.1:1234
	if got := clientIP(r); got != "192.0.2.1" {
		t.Errorf("clientIP = %q, want 192.0.2.1", got)
	}
}

func TestMiddleware_ReusesLoggerRequestID(t *testing.T) {
	var auditID, loggerID string
	inner := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		auditID = requestMetaFrom(r.Context()).RequestID
		loggerID = logger.RequestIDFromContext(r.Context())
	})
	chain := logger.Middleware(slog.New(slog.NewTextHandler(io.Discard, nil)))(Middleware(false)(inner))

	// No X-Request-Id header: both middlewares must agree on ONE generated id.
	chain.ServeHTTP(httptest.NewRecorder(), httptest.NewRequest(http.MethodGet, "/", nil))
	if auditID == "" || auditID != loggerID {
		t.Errorf("audit request_id %q != logger request_id %q", auditID, loggerID)
	}

	// Explicit header: both must carry it through.
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req.Header.Set("X-Request-Id", "fixed-id")
	chain.ServeHTTP(httptest.NewRecorder(), req)
	if auditID != "fixed-id" || loggerID != "fixed-id" {
		t.Errorf("got audit=%q logger=%q, want both fixed-id", auditID, loggerID)
	}
}
