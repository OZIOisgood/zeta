package auth

import (
	"crypto/rand"
	"crypto/rsa"
	"encoding/base64"
	"encoding/json"
	"log/slog"
	"math/big"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

// newTestJWKSServer serves a JWKS with a freshly generated RSA key under kid "test-kid".
func newTestJWKSServer(t *testing.T) (*httptest.Server, *rsa.PrivateKey) {
	t.Helper()
	key, err := rsa.GenerateKey(rand.Reader, 2048)
	if err != nil {
		t.Fatal(err)
	}
	n := base64.RawURLEncoding.EncodeToString(key.PublicKey.N.Bytes())
	e := base64.RawURLEncoding.EncodeToString(big.NewInt(int64(key.PublicKey.E)).Bytes())
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		json.NewEncoder(w).Encode(map[string]any{
			"keys": []map[string]string{{
				"kid": "test-kid", "kty": "RSA", "alg": "RS256", "use": "sig", "n": n, "e": e,
			}},
		})
	}))
	t.Cleanup(srv.Close)
	return srv, key
}

func signedTestToken(t *testing.T, key *rsa.PrivateKey) string {
	t.Helper()
	token := jwt.NewWithClaims(jwt.SigningMethodRS256, jwt.MapClaims{
		"sub":         "user_123",
		"email":       "user@example.test",
		"role":        "student",
		"sid":         "session_123",
		"permissions": []string{"assets:read"},
		"exp":         time.Now().Add(time.Hour).Unix(),
	})
	token.Header["kid"] = "test-kid"
	signed, err := token.SignedString(key)
	if err != nil {
		t.Fatal(err)
	}
	return signed
}

func TestMiddlewareAcceptsBearerToken(t *testing.T) {
	srv, key := newTestJWKSServer(t)
	jwks := NewJWKSCache(srv.URL, time.Hour)

	var got *UserContext
	handler := Middleware(slog.Default(), jwks)(http.HandlerFunc(func(_ http.ResponseWriter, r *http.Request) {
		got = GetUser(r.Context())
	}))

	req := httptest.NewRequest(http.MethodGet, "/auth/me", nil)
	req.Header.Set("Authorization", "Bearer "+signedTestToken(t, key))
	handler.ServeHTTP(httptest.NewRecorder(), req)

	if got == nil {
		t.Fatal("expected authenticated user from Bearer token")
	}
	if got.ID != "user_123" || got.Role != "student" {
		t.Fatalf("unexpected user context: %+v", got)
	}
	if len(got.Permissions) != 1 || got.Permissions[0] != "assets:read" {
		t.Fatalf("unexpected permissions: %v", got.Permissions)
	}
}

func TestMiddlewareIgnoresInvalidBearerToken(t *testing.T) {
	srv, _ := newTestJWKSServer(t)
	jwks := NewJWKSCache(srv.URL, time.Hour)

	called := false
	var got *UserContext
	handler := Middleware(slog.Default(), jwks)(http.HandlerFunc(func(_ http.ResponseWriter, r *http.Request) {
		called = true
		got = GetUser(r.Context())
	}))

	req := httptest.NewRequest(http.MethodGet, "/auth/me", nil)
	req.Header.Set("Authorization", "Bearer not-a-jwt")
	handler.ServeHTTP(httptest.NewRecorder(), req)

	if !called {
		t.Fatal("middleware must pass through on invalid tokens")
	}
	if got != nil {
		t.Fatal("expected no user for invalid token")
	}
}

func TestMiddlewarePrefersBearerOverCookie(t *testing.T) {
	srv, key := newTestJWKSServer(t)
	jwks := NewJWKSCache(srv.URL, time.Hour)

	var got *UserContext
	handler := Middleware(slog.Default(), jwks)(http.HandlerFunc(func(_ http.ResponseWriter, r *http.Request) {
		got = GetUser(r.Context())
	}))

	req := httptest.NewRequest(http.MethodGet, "/auth/me", nil)
	req.Header.Set("Authorization", "Bearer "+signedTestToken(t, key))
	req.AddCookie(&http.Cookie{Name: CookieName, Value: "garbage-cookie-token"})
	handler.ServeHTTP(httptest.NewRecorder(), req)

	if got == nil || got.ID != "user_123" {
		t.Fatalf("expected Bearer token to win over cookie, got %+v", got)
	}
}
