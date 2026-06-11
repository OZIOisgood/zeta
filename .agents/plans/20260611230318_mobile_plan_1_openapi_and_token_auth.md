# Mobile Plan 1: OpenAPI Contract + Mobile Token Auth — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the Go API a token-based auth flow for the mobile app (PKCE code exchange + refresh, JSON tokens instead of cookies) and establish the OpenAPI contract that the mobile client will be generated from.

**Architecture:** The mobile app performs AuthKit login via PKCE in the system browser, then posts the authorization code to a new `POST /auth/token` endpoint which reuses the existing WorkOS code-exchange and org-scoping logic from `Callback` but returns tokens as JSON. `POST /auth/token/refresh` rotates the pair. The auth middleware already accepts `Authorization: Bearer` (internal/auth/middleware.go:33) — this plan adds the missing test coverage. A hand-maintained `api/openapi.yaml` becomes the contract; it starts with the auth + health slice and grows with each mobile work package.

**Tech Stack:** Go 1.25, chi, workos-go v4.46.1 (`AuthenticateWithCodeOpts.CodeVerifier` exists), gomock (`go.uber.org/mock`), OpenAPI 3.1, Redocly CLI via `pnpm dlx`.

**Parent spec:** `.agents/plans/20260611225227_mobile_app_react_native_expo_design.md`

**Plan series:** This is Plan 1 of the mobile build. Subsequent plans (app skeleton + design system, videos/upload, reviews, groups/invites, coaching/calls, push, compliance/release) get their own documents once this lands.

**Conventions that apply to every task:**
- Structured logging: `log/slog` JSON, stable snake_case event names, `component` attr, errors in `err`. Never log tokens.
- Run Go tests with `go test ./internal/auth/ -count=1 -v` (or `make test:unit` for the full suite).
- Commit after every green task. No `Co-Authored-By` trailer. Never `git add -A` (untracked noise: `.claude/`, `CLAUDE.md`, `web/dashboard/`).

---

## File Structure

| File | Action | Responsibility |
| --- | --- | --- |
| `internal/auth/handler.go` | Modify | Add `establishSession` helper, `TokenExchange`, `TokenRefresh`, shared request/response types |
| `internal/auth/handler_test.go` | Modify | Tests for token exchange + refresh |
| `internal/auth/middleware_test.go` | Create | Bearer-token coverage for the existing middleware |
| `internal/api/server.go` | Modify | Move DevToken route, register the two new routes |
| `api/openapi.yaml` | Create | OpenAPI 3.1 contract (auth + health slice) |
| `Makefile` | Modify | `api:openapi:lint` target |
| `.github/workflows/ci.yml` | Modify | OpenAPI lint job |
| `README.md` | Modify | Mobile token flow documentation |

---

### Task 1: Extract `establishSession` from `Callback`

The code-exchange + default-org-scoping block in `Callback` (internal/auth/handler.go:310-349) must be reusable by the mobile token exchange. Pure refactor under existing tests — no new behavior.

**Files:**
- Modify: `internal/auth/handler.go:310-349`
- Tests: existing `internal/auth/handler_test.go` (`TestCallbackRedirectsToStoredReturnTo` is the safety net)

- [ ] **Step 1: Run the existing auth tests to confirm a green baseline**

Run: `go test ./internal/auth/ -count=1`
Expected: PASS

- [ ] **Step 2: Add the helper and types to `internal/auth/handler.go`**

Insert directly above `func (h *Handler) Callback(`:

```go
// sessionTokens bundles the WorkOS tokens established for a login session.
type sessionTokens struct {
	AccessToken  string
	RefreshToken string
	UserID       string
}

// establishSession exchanges an AuthKit authorization code for WorkOS tokens
// and ensures the session is scoped to the default organization. codeVerifier
// is empty for the web cookie flow and set for the mobile PKCE flow.
func (h *Handler) establishSession(ctx context.Context, code, codeVerifier string) (sessionTokens, error) {
	resp, err := h.workos.AuthenticateWithCode(ctx, usermanagement.AuthenticateWithCodeOpts{
		ClientID:     os.Getenv("WORKOS_CLIENT_ID"),
		Code:         code,
		CodeVerifier: codeVerifier,
	})
	if err != nil {
		return sessionTokens{}, fmt.Errorf("authenticate with code: %w", err)
	}

	tokens := sessionTokens{
		AccessToken:  resp.AccessToken,
		RefreshToken: resp.RefreshToken,
		UserID:       resp.User.ID,
	}

	if resp.OrganizationID == "" {
		if _, _, err := h.ensureUserInOrg(ctx, resp.User.ID); err != nil {
			return sessionTokens{}, fmt.Errorf("ensure user in org: %w", err)
		}
		scoped, err := h.refreshSessionForDefaultOrg(ctx, tokens.RefreshToken)
		if err != nil {
			return sessionTokens{}, fmt.Errorf("refresh session for default org: %w", err)
		}
		tokens.AccessToken = scoped.AccessToken
		tokens.RefreshToken = scoped.RefreshToken
	}

	return tokens, nil
}
```

- [ ] **Step 3: Rewrite the corresponding `Callback` block to use the helper**

Replace everything in `Callback` from `clientID := os.Getenv("WORKOS_CLIENT_ID")` (line 308) through the closing brace of the `if resp.OrganizationID == ""` block (line 349) with:

```go
	tokens, err := h.establishSession(ctx, code, "")
	if err != nil {
		h.logger.ErrorContext(ctx, "auth_session_establish_failed",
			slog.String("component", "auth"),
			slog.Any("err", err),
		)
		http.Error(w, "Authentication failed", http.StatusInternalServerError)
		return
	}
	accessToken := tokens.AccessToken
	refreshToken := tokens.RefreshToken
```

Then update the two later usages in `Callback`:
- `setSessionCookies(w, accessToken, refreshToken, true)` stays as-is (variables still exist).
- The success log `auth_login_succeeded` used `resp.User.ID` — change to `tokens.UserID`.

Note: this collapses the three previous error log events (`auth_authenticate_failed`, `auth_ensure_org_failed`, `auth_org_session_refresh_failed`) into `auth_session_establish_failed` for the callback path; the cause stays visible in the wrapped `err`. The unused `refreshToken` variable warning will not occur because both variables are used by `setSessionCookies`.

- [ ] **Step 4: Run tests and vet**

Run: `go vet ./... && go test ./internal/auth/ -count=1`
Expected: PASS, no vet findings

- [ ] **Step 5: Commit**

```bash
git add internal/auth/handler.go
git commit -m "refactor(auth): extract establishSession from callback for reuse"
```

---

### Task 2: Move DevToken to `/auth/dev/token`

`POST /auth/token` is currently occupied by the dev-only password-auth endpoint (internal/api/server.go:164). The mobile code exchange takes over `/auth/token`; DevToken moves to `/auth/dev/token`.

**Files:**
- Modify: `internal/api/server.go:162-165`

- [ ] **Step 1: Find all references to the old path**

Run: `grep -rn "auth/token" --include="*.go" --include="*.md" --include="*.ts" --include="*.sh" --include="*.yml" . | grep -v node_modules | grep -v ".agents/plans"`
Expected: the `server.go` route registration, possibly docs/scripts (e.g. dev tooling or skills that fetch a dev token). Update every hit to `/auth/dev/token` in the same task.

- [ ] **Step 2: Change the route registration in `internal/api/server.go`**

Old:

```go
		// Dev-only: issues a Zeta JWT via password auth — never enable in production
		if os.Getenv("DEV_AUTH_ENABLED") == "true" {
			r.Post("/auth/token", authHandler.DevToken)
		}
```

New:

```go
		// Dev-only: issues a Zeta JWT via password auth — never enable in production
		if os.Getenv("DEV_AUTH_ENABLED") == "true" {
			r.Post("/auth/dev/token", authHandler.DevToken)
		}
```

- [ ] **Step 3: Build and test**

Run: `go build -o /dev/null ./cmd/api && go test ./... -count=1`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add internal/api/server.go
git commit -m "refactor(auth): move dev token endpoint to /auth/dev/token"
```

(Include any reference updates from Step 1 in the same commit.)

---

### Task 3: `POST /auth/token` — mobile PKCE code exchange

**Files:**
- Modify: `internal/auth/handler.go` (new handler below `DevToken`)
- Modify: `internal/auth/handler_test.go`
- Modify: `internal/api/server.go:156-166` (route)

- [ ] **Step 1: Write the failing tests**

Append to `internal/auth/handler_test.go`:

```go
func TestTokenExchangeReturnsTokenPair(t *testing.T) {
	t.Setenv("WORKOS_CLIENT_ID", "client_test")

	ctrl := gomock.NewController(t)
	workos := authmocks.NewMockUserManagement(ctrl)
	workos.EXPECT().AuthenticateWithCode(gomock.Any(), usermanagement.AuthenticateWithCodeOpts{
		ClientID:     "client_test",
		Code:         "code_123",
		CodeVerifier: "verifier_abc",
	}).Return(usermanagement.AuthenticateResponse{
		User:           usermanagement.User{ID: "user_123"},
		OrganizationID: "org_123",
		AccessToken:    testAccessToken(t),
		RefreshToken:   "refresh_123",
	}, nil)

	h := NewHandler(slog.Default(), nil, workos)
	body := strings.NewReader(`{"code":"code_123","code_verifier":"verifier_abc"}`)
	req := httptest.NewRequest(http.MethodPost, "/auth/token", body)
	rec := httptest.NewRecorder()

	h.TokenExchange(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("got status %d, want %d", rec.Code, http.StatusOK)
	}
	var resp struct {
		AccessToken  string `json:"access_token"`
		RefreshToken string `json:"refresh_token"`
	}
	if err := json.NewDecoder(rec.Body).Decode(&resp); err != nil {
		t.Fatal(err)
	}
	if resp.AccessToken == "" || resp.RefreshToken != "refresh_123" {
		t.Fatalf("unexpected token pair: %+v", resp)
	}
	if len(rec.Result().Cookies()) != 0 {
		t.Fatalf("mobile flow must not set cookies, got %d", len(rec.Result().Cookies()))
	}
}

func TestTokenExchangeRequiresCode(t *testing.T) {
	h := NewHandler(slog.Default(), nil, nil)
	req := httptest.NewRequest(http.MethodPost, "/auth/token", strings.NewReader(`{"code_verifier":"v"}`))
	rec := httptest.NewRecorder()

	h.TokenExchange(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("got status %d, want %d", rec.Code, http.StatusBadRequest)
	}
}

func TestTokenExchangeRejectsFailedAuthentication(t *testing.T) {
	t.Setenv("WORKOS_CLIENT_ID", "client_test")

	ctrl := gomock.NewController(t)
	workos := authmocks.NewMockUserManagement(ctrl)
	workos.EXPECT().AuthenticateWithCode(gomock.Any(), gomock.Any()).
		Return(usermanagement.AuthenticateResponse{}, fmt.Errorf("invalid code"))

	h := NewHandler(slog.Default(), nil, workos)
	req := httptest.NewRequest(http.MethodPost, "/auth/token", strings.NewReader(`{"code":"bad"}`))
	rec := httptest.NewRecorder()

	h.TokenExchange(rec, req)

	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("got status %d, want %d", rec.Code, http.StatusUnauthorized)
	}
}
```

`fmt` must be added to the test file imports if not already present. The default-org-scoping branch (`OrganizationID == ""`) is intentionally not re-tested here: it lives in `establishSession`, shared with `Callback`, and `getPermissionsForRole` performs a raw HTTP call that cannot be mocked through `UserManagement`.

- [ ] **Step 2: Run tests to verify they fail**

Run: `go test ./internal/auth/ -run TestTokenExchange -count=1 -v`
Expected: FAIL — `h.TokenExchange undefined`

- [ ] **Step 3: Implement `TokenExchange` in `internal/auth/handler.go`**

Append below `DevToken`:

```go
type tokenExchangeRequest struct {
	Code         string `json:"code"`
	CodeVerifier string `json:"code_verifier"`
}

type tokenPairResponse struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
}

// TokenExchange exchanges an AuthKit authorization code (PKCE) for WorkOS
// tokens and returns them as JSON. This is the mobile counterpart of Callback:
// same session establishment, but tokens travel in the response body instead
// of HttpOnly cookies. The mobile client stores them in secure storage.
func (h *Handler) TokenExchange(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	var req tokenExchangeRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}
	if req.Code == "" {
		http.Error(w, "code is required", http.StatusBadRequest)
		return
	}

	tokens, err := h.establishSession(ctx, req.Code, req.CodeVerifier)
	if err != nil {
		h.logger.WarnContext(ctx, "auth_token_exchange_failed",
			slog.String("component", "auth"),
			slog.Any("err", err),
		)
		http.Error(w, "Authentication failed", http.StatusUnauthorized)
		return
	}

	h.logger.InfoContext(ctx, "auth_token_exchange_succeeded",
		slog.String("component", "auth"),
		slog.String("user_id", tokens.UserID),
	)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(tokenPairResponse{
		AccessToken:  tokens.AccessToken,
		RefreshToken: tokens.RefreshToken,
	})
}
```

- [ ] **Step 4: Register the route in `internal/api/server.go`**

Inside the auth route group, after `r.Put("/auth/me", authHandler.UpdateMe)`:

```go
		// Mobile PKCE flow: exchanges an AuthKit code for a JSON token pair
		r.Post("/auth/token", authHandler.TokenExchange)
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `go vet ./... && go test ./internal/auth/ -count=1`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add internal/auth/handler.go internal/auth/handler_test.go internal/api/server.go
git commit -m "feat(auth): add mobile PKCE token exchange endpoint"
```

---

### Task 4: `POST /auth/token/refresh` — token rotation

**Files:**
- Modify: `internal/auth/handler.go` (below `TokenExchange`)
- Modify: `internal/auth/handler_test.go`
- Modify: `internal/api/server.go` (route)

- [ ] **Step 1: Write the failing tests**

Append to `internal/auth/handler_test.go`:

```go
func TestTokenRefreshReturnsRotatedPair(t *testing.T) {
	t.Setenv("WORKOS_CLIENT_ID", "client_test")

	ctrl := gomock.NewController(t)
	workos := authmocks.NewMockUserManagement(ctrl)
	workos.EXPECT().AuthenticateWithRefreshToken(gomock.Any(), usermanagement.AuthenticateWithRefreshTokenOpts{
		ClientID:     "client_test",
		RefreshToken: "refresh_old",
	}).Return(usermanagement.RefreshAuthenticationResponse{
		AccessToken:  "access_new",
		RefreshToken: "refresh_new",
	}, nil)

	h := NewHandler(slog.Default(), nil, workos)
	req := httptest.NewRequest(http.MethodPost, "/auth/token/refresh", strings.NewReader(`{"refresh_token":"refresh_old"}`))
	rec := httptest.NewRecorder()

	h.TokenRefresh(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("got status %d, want %d", rec.Code, http.StatusOK)
	}
	var resp struct {
		AccessToken  string `json:"access_token"`
		RefreshToken string `json:"refresh_token"`
	}
	if err := json.NewDecoder(rec.Body).Decode(&resp); err != nil {
		t.Fatal(err)
	}
	if resp.AccessToken != "access_new" || resp.RefreshToken != "refresh_new" {
		t.Fatalf("unexpected token pair: %+v", resp)
	}
}

func TestTokenRefreshRequiresToken(t *testing.T) {
	h := NewHandler(slog.Default(), nil, nil)
	req := httptest.NewRequest(http.MethodPost, "/auth/token/refresh", strings.NewReader(`{}`))
	rec := httptest.NewRecorder()

	h.TokenRefresh(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("got status %d, want %d", rec.Code, http.StatusBadRequest)
	}
}

func TestTokenRefreshRejectsFailedRefresh(t *testing.T) {
	t.Setenv("WORKOS_CLIENT_ID", "client_test")

	ctrl := gomock.NewController(t)
	workos := authmocks.NewMockUserManagement(ctrl)
	workos.EXPECT().AuthenticateWithRefreshToken(gomock.Any(), gomock.Any()).
		Return(usermanagement.RefreshAuthenticationResponse{}, fmt.Errorf("revoked"))

	h := NewHandler(slog.Default(), nil, workos)
	req := httptest.NewRequest(http.MethodPost, "/auth/token/refresh", strings.NewReader(`{"refresh_token":"revoked"}`))
	rec := httptest.NewRecorder()

	h.TokenRefresh(rec, req)

	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("got status %d, want %d", rec.Code, http.StatusUnauthorized)
	}
}
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `go test ./internal/auth/ -run TestTokenRefresh -count=1 -v`
Expected: FAIL — `h.TokenRefresh undefined`

- [ ] **Step 3: Implement `TokenRefresh` in `internal/auth/handler.go`**

Append below `TokenExchange`:

```go
type tokenRefreshRequest struct {
	RefreshToken string `json:"refresh_token"`
}

// TokenRefresh rotates a WorkOS token pair for the mobile flow. WorkOS
// invalidates the presented refresh token, so the client must always replace
// its stored pair with the returned one.
func (h *Handler) TokenRefresh(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	var req tokenRefreshRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}
	if req.RefreshToken == "" {
		http.Error(w, "refresh_token is required", http.StatusBadRequest)
		return
	}

	resp, err := h.workos.AuthenticateWithRefreshToken(ctx, usermanagement.AuthenticateWithRefreshTokenOpts{
		ClientID:     os.Getenv("WORKOS_CLIENT_ID"),
		RefreshToken: req.RefreshToken,
	})
	if err != nil {
		h.logger.WarnContext(ctx, "auth_token_refresh_failed",
			slog.String("component", "auth"),
			slog.Any("err", err),
		)
		http.Error(w, "Refresh failed", http.StatusUnauthorized)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(tokenPairResponse{
		AccessToken:  resp.AccessToken,
		RefreshToken: resp.RefreshToken,
	})
}
```

(`auth_token_refresh_failed` is the same stable event name `UpdateMe` already uses for its cookie-based refresh — intentional reuse.)

- [ ] **Step 4: Register the route in `internal/api/server.go`**

Directly below the `/auth/token` registration from Task 3:

```go
		r.Post("/auth/token/refresh", authHandler.TokenRefresh)
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `go vet ./... && go test ./internal/auth/ -count=1`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add internal/auth/handler.go internal/auth/handler_test.go internal/api/server.go
git commit -m "feat(auth): add mobile token refresh endpoint"
```

---

### Task 5: Bearer-token test coverage for the middleware

The middleware already prefers `Authorization: Bearer` over the cookie (internal/auth/middleware.go:33) but has zero test coverage. The mobile flow depends on it, so lock it in.

**Files:**
- Create: `internal/auth/middleware_test.go`

- [ ] **Step 1: Write the tests**

Create `internal/auth/middleware_test.go`:

```go
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
```

- [ ] **Step 2: Run the tests**

Run: `go test ./internal/auth/ -run TestMiddleware -count=1 -v`
Expected: PASS (the middleware behavior already exists — these tests document and pin it). If any test fails, the middleware has a real bug: stop and investigate before continuing.

- [ ] **Step 3: Commit**

```bash
git add internal/auth/middleware_test.go
git commit -m "test(auth): cover Bearer token path in auth middleware"
```

---

### Task 6: OpenAPI contract `api/openapi.yaml`

The contract starts with the slice the mobile auth work needs (health, token endpoints, `/auth/me`, logout). Later plans extend it endpoint-by-endpoint.

**Files:**
- Create: `api/openapi.yaml`

- [ ] **Step 1: Create `api/openapi.yaml`**

```yaml
openapi: 3.1.0
info:
  title: Zeta API
  version: 0.1.0
  description: >
    Contract for the Zeta API consumed by the mobile app. This spec currently
    covers the auth and health endpoints; it grows with each mobile work
    package. The mobile TypeScript client is generated from this file with
    openapi-typescript / openapi-fetch.
servers:
  - url: http://localhost:8080
    description: Local development
tags:
  - name: auth
  - name: system
paths:
  /health:
    get:
      tags: [system]
      summary: Health check
      operationId: getHealth
      security: []
      responses:
        "200":
          description: API is healthy
          content:
            application/json:
              schema:
                type: object
                properties:
                  status:
                    type: string
                    enum: [ok]
                required: [status]
  /auth/token:
    post:
      tags: [auth]
      summary: Exchange an AuthKit authorization code (PKCE) for a token pair
      operationId: exchangeToken
      security: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/TokenExchangeRequest"
      responses:
        "200":
          description: Token pair for the authenticated session
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/TokenPair"
        "400":
          description: Missing code or invalid request body
        "401":
          description: WorkOS rejected the authorization code
  /auth/token/refresh:
    post:
      tags: [auth]
      summary: Rotate a token pair using a refresh token
      description: >
        WorkOS invalidates the presented refresh token. Clients must always
        replace their stored pair with the returned one.
      operationId: refreshToken
      security: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/TokenRefreshRequest"
      responses:
        "200":
          description: Rotated token pair
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/TokenPair"
        "400":
          description: Missing refresh_token or invalid request body
        "401":
          description: Refresh token expired or revoked
  /auth/me:
    get:
      tags: [auth]
      summary: Current user profile, role, permissions, and preferences
      operationId: getMe
      responses:
        "200":
          description: Authenticated user
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/Me"
        "401":
          description: Not authenticated
    put:
      tags: [auth]
      summary: Update profile and notification preferences
      operationId: updateMe
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/UpdateMeRequest"
      responses:
        "200":
          description: Updated user
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/Me"
        "400":
          description: Invalid or missing timezone, invalid body
        "401":
          description: Not authenticated
  /auth/logout:
    post:
      tags: [auth]
      summary: End the session and get the WorkOS logout URL
      operationId: logout
      responses:
        "200":
          description: Logout URL to open for session termination at WorkOS
          content:
            application/json:
              schema:
                type: object
                properties:
                  logoutUrl:
                    type: string
                required: [logoutUrl]
security:
  - bearerAuth: []
components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
      description: WorkOS access token, validated via JWKS
  schemas:
    TokenExchangeRequest:
      type: object
      properties:
        code:
          type: string
          description: Authorization code from the AuthKit redirect
        code_verifier:
          type: string
          description: PKCE code verifier matching the code_challenge sent to AuthKit
      required: [code]
    TokenRefreshRequest:
      type: object
      properties:
        refresh_token:
          type: string
      required: [refresh_token]
    TokenPair:
      type: object
      properties:
        access_token:
          type: string
        refresh_token:
          type: string
      required: [access_token, refresh_token]
    EmailPreferences:
      type: object
      properties:
        notifications_enabled:
          type: boolean
        asset_uploads_enabled:
          type: boolean
        asset_reviews_enabled:
          type: boolean
        invitation_updates_enabled:
          type: boolean
        group_membership_updates_enabled:
          type: boolean
        coaching_booking_updates_enabled:
          type: boolean
        coaching_reminders_enabled:
          type: boolean
      required:
        - notifications_enabled
        - asset_uploads_enabled
        - asset_reviews_enabled
        - invitation_updates_enabled
        - group_membership_updates_enabled
        - coaching_booking_updates_enabled
        - coaching_reminders_enabled
    Me:
      type: object
      properties:
        id:
          type: string
        first_name:
          type: string
        last_name:
          type: string
        email:
          type: string
        language:
          type: string
          enum: [en, de, fr]
        avatar:
          type: string
          description: Base64-encoded avatar image, empty when unset
        timezone:
          type: string
        email_preferences:
          $ref: "#/components/schemas/EmailPreferences"
        role:
          type: string
        permissions:
          type: array
          items:
            type: string
      required:
        - id
        - first_name
        - last_name
        - email
        - language
        - avatar
        - timezone
        - email_preferences
        - role
        - permissions
    UpdateMeRequest:
      type: object
      properties:
        first_name:
          type: string
        last_name:
          type: string
        language:
          type: string
          enum: [en, de, fr]
        avatar:
          type: string
          description: Base64-encoded avatar image; omit to keep the current one
        timezone:
          type: string
        email_preferences:
          $ref: "#/components/schemas/EmailPreferences"
      required: [timezone]
```

- [ ] **Step 2: Lint the spec**

Run: `pnpm dlx @redocly/cli@2 lint api/openapi.yaml`
Expected: `Woohoo! Your API description is valid.` (warnings about missing `license`/`contact` info are acceptable; errors are not)

- [ ] **Step 3: Commit**

```bash
git add api/openapi.yaml
git commit -m "feat(api): add OpenAPI contract for auth and health endpoints"
```

---

### Task 7: Lint wiring — Makefile target + CI job

**Files:**
- Modify: `Makefile` (after the `api:*` targets, before `email:preview`)
- Modify: `.github/workflows/ci.yml`

- [ ] **Step 1: Add the Makefile target**

Insert after the `api\:restart:` target (Makefile:23-26):

```make
api\:openapi\:lint:
	pnpm dlx @redocly/cli@2 lint api/openapi.yaml
```

(Note: Makefile targets in this repo escape colons as `\:` — follow that style exactly.)

- [ ] **Step 2: Verify the target works**

Run: `make api:openapi:lint`
Expected: same valid result as Task 6 Step 2

- [ ] **Step 3: Add a CI job to `.github/workflows/ci.yml`**

Append after the `lint-and-build-web` job, at the same indentation level:

```yaml
  lint-openapi:
    name: Lint OpenAPI Spec
    runs-on: ubuntu-latest
    permissions:
      contents: read
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with:
          version: 10.33.4

      - uses: actions/setup-node@v4
        with:
          node-version: 22

      - name: Lint OpenAPI spec
        run: pnpm dlx @redocly/cli@2 lint api/openapi.yaml
```

- [ ] **Step 4: Commit**

```bash
git add Makefile .github/workflows/ci.yml
git commit -m "ci: lint OpenAPI spec in Makefile and CI"
```

---

### Task 8: Document the mobile token flow

**Files:**
- Modify: `README.md` (the `### Auth Flow` section, README.md:104-109)

- [ ] **Step 1: Extend the Auth Flow section**

Append to the `### Auth Flow` section after the existing "Redirect Preservation" bullet:

```markdown
- **Mobile Token Flow**: Native apps authenticate with AuthKit via PKCE in the
  system browser. The app sends the authorization code to `POST /auth/token`
  (`{ "code": "...", "code_verifier": "..." }`) and receives an access/refresh
  token pair as JSON instead of cookies. `POST /auth/token/refresh` rotates the
  pair; the presented refresh token is invalidated by WorkOS. Authenticated
  API requests send `Authorization: Bearer <access_token>`. The mobile redirect
  URI (e.g. `zeta://auth/callback`) must be registered in the WorkOS dashboard.
- The dev-only password-auth endpoint moved from `/auth/token` to
  `/auth/dev/token` (requires `DEV_AUTH_ENABLED=true`).
```

Also update the API example block (README.md:179-185) to show both transports:

```markdown
Check auth status:

```bash
curl -b "zeta_session=..." http://localhost:8080/auth/me
curl -H "Authorization: Bearer ..." http://localhost:8080/auth/me
```
```

- [ ] **Step 2: Run the full test suite one final time**

Run: `go vet ./... && make test:unit`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: document mobile token auth flow"
```

---

## Out of Scope (later plans)

- The Expo app itself (Plan 2: app skeleton + design system + auth integration in the client).
- Client generation tooling inside `mobile/` (`openapi-typescript` runs there, set up in Plan 2).
- Push notifications, `user_devices` table (own plan).
- Account deletion endpoint and Sign-in-with-Apple decision (compliance plan).
- WorkOS dashboard configuration (mobile redirect URI) — manual step when Plan 2 starts; not automatable from this repo.

## Verification Checklist (end of plan)

- [ ] `go vet ./...` clean
- [ ] `make test:unit` green
- [ ] `make api:openapi:lint` green
- [ ] `make api:build` succeeds
- [ ] Manual smoke (optional, needs `DEV_AUTH_ENABLED=true` + local infra): `curl -X POST localhost:8080/auth/dev/token -d '{"email":"...","password":"..."}'` returns a token; `curl -H "Authorization: Bearer <token>" localhost:8080/auth/me` returns the user.
