package auth

import (
	"log/slog"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

func rateLimitedHandler(l *IPRateLimiter) http.Handler {
	return l.Middleware(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))
}

func doRequest(handler http.Handler, remoteAddr, xff string) int {
	req := httptest.NewRequest(http.MethodPost, "/auth/token", nil)
	req.RemoteAddr = remoteAddr
	if xff != "" {
		req.Header.Set("X-Forwarded-For", xff)
	}
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	return rec.Code
}

func TestRateLimiterAllowsBurstThenRejects(t *testing.T) {
	l := NewIPRateLimiter(slog.Default(), 10, 3)
	handler := rateLimitedHandler(l)

	for i := 0; i < 3; i++ {
		if code := doRequest(handler, "203.0.113.1:1234", ""); code != http.StatusOK {
			t.Fatalf("request %d: got status %d, want %d", i, code, http.StatusOK)
		}
	}
	if code := doRequest(handler, "203.0.113.1:1234", ""); code != http.StatusTooManyRequests {
		t.Fatalf("got status %d, want %d", code, http.StatusTooManyRequests)
	}
}

func TestRateLimiterIsolatesClients(t *testing.T) {
	l := NewIPRateLimiter(slog.Default(), 10, 1)
	handler := rateLimitedHandler(l)

	if code := doRequest(handler, "203.0.113.1:1234", ""); code != http.StatusOK {
		t.Fatalf("client A first request: got %d", code)
	}
	if code := doRequest(handler, "203.0.113.1:1234", ""); code != http.StatusTooManyRequests {
		t.Fatalf("client A second request: got %d, want 429", code)
	}
	if code := doRequest(handler, "203.0.113.2:1234", ""); code != http.StatusOK {
		t.Fatalf("client B must not be limited by client A, got %d", code)
	}
}

func TestRateLimiterUsesForwardedFor(t *testing.T) {
	l := NewIPRateLimiter(slog.Default(), 10, 1)
	handler := rateLimitedHandler(l)

	// Same proxy address, different originating clients.
	if code := doRequest(handler, "10.0.0.1:1234", "198.51.100.1, 10.0.0.1"); code != http.StatusOK {
		t.Fatalf("forwarded client A: got %d", code)
	}
	if code := doRequest(handler, "10.0.0.1:1234", "198.51.100.2, 10.0.0.1"); code != http.StatusOK {
		t.Fatalf("forwarded client B must not share A's bucket, got %d", code)
	}
	if code := doRequest(handler, "10.0.0.1:1234", "198.51.100.1, 10.0.0.1"); code != http.StatusTooManyRequests {
		t.Fatalf("forwarded client A second request: got %d, want 429", code)
	}
}

func TestRateLimiterRefillsOverTime(t *testing.T) {
	l := NewIPRateLimiter(slog.Default(), 60, 1) // 1 token per second
	current := time.Unix(1_700_000_000, 0)
	l.now = func() time.Time { return current }
	handler := rateLimitedHandler(l)

	if code := doRequest(handler, "203.0.113.1:1234", ""); code != http.StatusOK {
		t.Fatalf("first request: got %d", code)
	}
	if code := doRequest(handler, "203.0.113.1:1234", ""); code != http.StatusTooManyRequests {
		t.Fatalf("second request: got %d, want 429", code)
	}
	current = current.Add(2 * time.Second)
	if code := doRequest(handler, "203.0.113.1:1234", ""); code != http.StatusOK {
		t.Fatalf("request after refill window: got %d", code)
	}
}

func TestRateLimiterPrunesIdleVisitors(t *testing.T) {
	l := NewIPRateLimiter(slog.Default(), 10, 1)
	current := time.Unix(1_700_000_000, 0)
	l.now = func() time.Time { return current }
	handler := rateLimitedHandler(l)

	doRequest(handler, "203.0.113.1:1234", "")
	current = current.Add(21 * time.Minute)
	doRequest(handler, "203.0.113.2:1234", "")

	l.mu.Lock()
	defer l.mu.Unlock()
	if _, ok := l.visitors["203.0.113.1"]; ok {
		t.Fatal("idle visitor must be pruned after the TTL")
	}
	if _, ok := l.visitors["203.0.113.2"]; !ok {
		t.Fatal("active visitor must survive pruning")
	}
}
