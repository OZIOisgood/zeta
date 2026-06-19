package auth_test

import (
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/OZIOisgood/zeta/internal/auth"
)

func schedulerTestChain(secret string) http.Handler {
	log := slog.New(slog.NewTextHandler(io.Discard, nil))
	ok := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { w.WriteHeader(http.StatusOK) })
	return auth.RequireSchedulerSecret(secret, log)(ok)
}

func TestRequireSchedulerSecret(t *testing.T) {
	cases := []struct {
		name       string
		secret     string
		authHeader string
		want       int
	}{
		{"correct secret", "s3cret", "Bearer s3cret", http.StatusOK},
		{"wrong secret", "s3cret", "Bearer wrong", http.StatusUnauthorized},
		{"missing header", "s3cret", "", http.StatusUnauthorized},
		{"empty configured secret locks endpoint", "", "Bearer anything", http.StatusUnauthorized},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodPost, "/internal/x", nil)
			if c.authHeader != "" {
				req.Header.Set("Authorization", c.authHeader)
			}
			rec := httptest.NewRecorder()
			schedulerTestChain(c.secret).ServeHTTP(rec, req)
			if rec.Code != c.want {
				t.Errorf("got %d, want %d", rec.Code, c.want)
			}
		})
	}
}
