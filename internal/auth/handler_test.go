package auth

import (
	"encoding/base64"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"testing"
	"time"

	authmocks "github.com/OZIOisgood/zeta/internal/auth/mocks"
	"github.com/golang-jwt/jwt/v5"
	"github.com/workos/workos-go/v4/pkg/usermanagement"
	"go.uber.org/mock/gomock"
)

func TestLoginWithReturnToPassesOpaqueStateToWorkOS(t *testing.T) {
	t.Setenv("DEV_AUTH_ENABLED", "true")
	t.Setenv("WORKOS_CLIENT_ID", "client_test")
	t.Setenv("WORKOS_REDIRECT_URI", "http://localhost:8080/auth/callback")

	ctrl := gomock.NewController(t)
	workos := authmocks.NewMockUserManagement(ctrl)
	var captured usermanagement.GetAuthorizationURLOpts
	workos.EXPECT().GetAuthorizationURL(gomock.Any()).DoAndReturn(
		func(opts usermanagement.GetAuthorizationURLOpts) (*url.URL, error) {
			captured = opts
			return url.Parse("https://auth.workos.test/authorize?state=" + url.QueryEscape(opts.State))
		},
	)

	h := NewHandler(slog.Default(), nil, workos)
	req := httptest.NewRequest(http.MethodGet, "/auth/login?return_to=%2Fgroups%3Finvite%3DAbC123", nil)
	rec := httptest.NewRecorder()

	h.Login(rec, req)

	if rec.Code != http.StatusSeeOther {
		t.Fatalf("got status %d, want %d", rec.Code, http.StatusSeeOther)
	}
	if captured.ClientID != "client_test" || captured.RedirectURI != "http://localhost:8080/auth/callback" || captured.Provider != "authkit" {
		t.Fatalf("unexpected authorization opts: %+v", captured)
	}
	if captured.State == "" {
		t.Fatal("expected generated WorkOS state")
	}
	if strings.Contains(captured.State, "AbC123") || strings.Contains(captured.State, "/groups") {
		t.Fatalf("state leaked return data: %q", captured.State)
	}

	cookie := authStateCookie(t, rec.Result().Cookies())
	if cookie.Path != authStateCookiePath {
		t.Fatalf("auth state cookie path %q, want %q", cookie.Path, authStateCookiePath)
	}
	stored := decodeAuthStateCookie(t, cookie.Value)
	if stored.State != captured.State {
		t.Fatalf("stored state %q, want %q", stored.State, captured.State)
	}
	if stored.ReturnTo != "/groups?invite=AbC123" {
		t.Fatalf("stored return_to %q, want invite URL", stored.ReturnTo)
	}
	if time.Until(stored.ExpiresAt) <= 0 {
		t.Fatal("expected future auth state expiry")
	}
}

func TestLoginRejectsInvalidReturnTo(t *testing.T) {
	tests := []struct {
		name     string
		returnTo string
	}{
		{name: "absolute url", returnTo: "https://evil.example/groups"},
		{name: "protocol relative url", returnTo: "//evil.example/groups"},
		{name: "backslash path", returnTo: `/\evil`},
		{name: "control character", returnTo: "/groups\nLocation: https://evil.example"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			workos := authmocks.NewMockUserManagement(ctrl)
			h := NewHandler(slog.Default(), nil, workos)

			reqURL := "/auth/login?" + url.Values{"return_to": []string{tt.returnTo}}.Encode()
			req := httptest.NewRequest(http.MethodGet, reqURL, nil)
			rec := httptest.NewRecorder()

			h.Login(rec, req)

			if rec.Code != http.StatusBadRequest {
				t.Fatalf("got status %d, want %d", rec.Code, http.StatusBadRequest)
			}
		})
	}
}

func TestCallbackRedirectsToStoredReturnTo(t *testing.T) {
	t.Setenv("DEV_AUTH_ENABLED", "true")
	t.Setenv("WORKOS_CLIENT_ID", "client_test")
	t.Setenv("FRONTEND_URL", "https://app.example.test/")

	ctrl := gomock.NewController(t)
	workos := authmocks.NewMockUserManagement(ctrl)
	workos.EXPECT().AuthenticateWithCode(gomock.Any(), usermanagement.AuthenticateWithCodeOpts{
		ClientID: "client_test",
		Code:     "code_123",
	}).Return(usermanagement.AuthenticateResponse{
		User:           usermanagement.User{ID: "user_123"},
		OrganizationID: "org_123",
		AccessToken:    testAccessToken(t),
		RefreshToken:   "refresh_123",
	}, nil)

	h := NewHandler(slog.Default(), nil, workos)
	state := authReturnState{
		State:     "opaque_state",
		ReturnTo:  "/groups?invite=AbC123",
		ExpiresAt: time.Now().Add(authStateTTL),
	}
	req := httptest.NewRequest(http.MethodGet, "/auth/callback?code=code_123&state=opaque_state", nil)
	req.AddCookie(encodedAuthStateCookie(t, state))
	rec := httptest.NewRecorder()

	h.Callback(rec, req)

	if rec.Code != http.StatusSeeOther {
		t.Fatalf("got status %d, want %d", rec.Code, http.StatusSeeOther)
	}
	if got := rec.Header().Get("Location"); got != "https://app.example.test/groups?invite=AbC123" {
		t.Fatalf("got redirect %q, want invite return URL", got)
	}
}

func TestCallbackRejectsMismatchedState(t *testing.T) {
	h := NewHandler(slog.Default(), nil, nil)
	state := authReturnState{
		State:     "expected_state",
		ReturnTo:  "/groups?invite=AbC123",
		ExpiresAt: time.Now().Add(authStateTTL),
	}
	req := httptest.NewRequest(http.MethodGet, "/auth/callback?code=code_123&state=wrong_state", nil)
	req.AddCookie(encodedAuthStateCookie(t, state))
	rec := httptest.NewRecorder()

	h.Callback(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("got status %d, want %d", rec.Code, http.StatusBadRequest)
	}
}

func authStateCookie(t *testing.T, cookies []*http.Cookie) *http.Cookie {
	t.Helper()
	for _, cookie := range cookies {
		if cookie.Name == AuthStateCookieName && cookie.Value != "" && cookie.MaxAge >= 0 {
			return cookie
		}
	}
	t.Fatalf("missing %s cookie", AuthStateCookieName)
	return nil
}

func encodedAuthStateCookie(t *testing.T, state authReturnState) *http.Cookie {
	t.Helper()
	payload, err := json.Marshal(state)
	if err != nil {
		t.Fatal(err)
	}
	return &http.Cookie{
		Name:  AuthStateCookieName,
		Value: base64.RawURLEncoding.EncodeToString(payload),
		Path:  authStateCookiePath,
	}
}

func decodeAuthStateCookie(t *testing.T, value string) authReturnState {
	t.Helper()
	payload, err := base64.RawURLEncoding.DecodeString(value)
	if err != nil {
		t.Fatal(err)
	}
	var state authReturnState
	if err := json.Unmarshal(payload, &state); err != nil {
		t.Fatal(err)
	}
	return state
}

func testAccessToken(t *testing.T) string {
	t.Helper()
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{"sid": "session_123"})
	signed, err := token.SignedString([]byte("test-secret"))
	if err != nil {
		t.Fatal(err)
	}
	return signed
}

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
