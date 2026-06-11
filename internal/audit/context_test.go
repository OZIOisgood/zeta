package audit

import (
	"net/http"
	"net/http/httptest"
	"testing"
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
