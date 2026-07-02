package auth

import (
	"context"
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
	"github.com/OZIOisgood/zeta/internal/db"
	dbmocks "github.com/OZIOisgood/zeta/internal/db/mocks"
	"github.com/OZIOisgood/zeta/internal/preferences"
	"github.com/golang-jwt/jwt/v5"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
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

// ── Logout ────────────────────────────────────────────────────────────────────

// logoutURL is the canonical WorkOS logout URL shape produced by GetLogoutURL.
const logoutBaseURL = "https://api.workos.test/user_management/sessions/logout"

func parseLogoutURL(t *testing.T, raw string) *url.URL {
	t.Helper()
	u, err := url.Parse(raw)
	require.NoError(t, err)
	return u
}

// TestLogout_CookiePath verifies the existing web-cookie path: the session ID
// is extracted from the JWT stored in the zeta_session cookie and handed to
// WorkOS, with the frontend URL as ReturnTo.
func TestLogout_CookiePath(t *testing.T) {
	t.Setenv("DEV_AUTH_ENABLED", "true")
	t.Setenv("FRONTEND_URL", "https://app.example.test")

	ctrl := gomock.NewController(t)
	workos := authmocks.NewMockUserManagement(ctrl)
	workos.EXPECT().GetLogoutURL(usermanagement.GetLogoutURLOpts{
		SessionID: "session_cookie",
		ReturnTo:  "https://app.example.test",
	}).Return(url.Parse(logoutBaseURL + "?session_id=session_cookie&return_to=https%3A%2F%2Fapp.example.test"))

	h := NewHandler(slog.Default(), nil, workos)

	// Build a JWT with the sid embedded (matches what Callback stores in the cookie).
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{"sid": "session_cookie"})
	cookieVal, err := token.SignedString([]byte("test-secret"))
	require.NoError(t, err)

	req := httptest.NewRequest(http.MethodPost, "/auth/logout", nil)
	req.AddCookie(&http.Cookie{Name: CookieName, Value: cookieVal})
	rec := httptest.NewRecorder()

	h.Logout(rec, req)

	require.Equal(t, http.StatusOK, rec.Code)
	var resp map[string]string
	require.NoError(t, json.NewDecoder(rec.Body).Decode(&resp))
	u := parseLogoutURL(t, resp["logoutUrl"])
	assert.Equal(t, "session_cookie", u.Query().Get("session_id"))
}

// TestLogout_BearerFallback is the core regression test for WP0: when no
// cookie is present (Bearer/mobile caller) the handler falls back to the SID
// from the JWT-middleware-populated UserContext and calls GetLogoutURL without
// a ReturnTo (no browser redirect needed for API callers).
func TestLogout_BearerFallback(t *testing.T) {
	t.Setenv("DEV_AUTH_ENABLED", "true")
	t.Setenv("FRONTEND_URL", "https://app.example.test")

	ctrl := gomock.NewController(t)
	workos := authmocks.NewMockUserManagement(ctrl)
	workos.EXPECT().GetLogoutURL(usermanagement.GetLogoutURLOpts{
		SessionID: "session_bearer",
		ReturnTo:  "",
	}).Return(url.Parse(logoutBaseURL + "?session_id=session_bearer"))

	h := NewHandler(slog.Default(), nil, workos)

	// No cookie — simulate Bearer caller with UserContext pre-populated by middleware.
	req := httptest.NewRequest(http.MethodPost, "/auth/logout", nil)
	req = contextWithUser(req, &UserContext{ID: "user_1", SID: "session_bearer"})
	rec := httptest.NewRecorder()

	h.Logout(rec, req)

	require.Equal(t, http.StatusOK, rec.Code)
	var resp map[string]string
	require.NoError(t, json.NewDecoder(rec.Body).Decode(&resp))
	u := parseLogoutURL(t, resp["logoutUrl"])
	assert.Equal(t, "session_bearer", u.Query().Get("session_id"),
		"WorkOS session must be revoked via the Bearer-path SID")
	assert.Empty(t, u.Query().Get("return_to"),
		"Bearer callers must not receive a browser ReturnTo")
}

// TestLogout_BearerReturnTo: when MOBILE_LOGOUT_RETURN_TO is configured, Bearer
// callers get it as the WorkOS ReturnTo so the logout browser tab deep-links
// back into the app instead of landing on the dashboard default redirect.
func TestLogout_BearerReturnTo(t *testing.T) {
	t.Setenv("DEV_AUTH_ENABLED", "true")
	t.Setenv("FRONTEND_URL", "https://app.example.test")
	t.Setenv("MOBILE_LOGOUT_RETURN_TO", "zeta://login")

	ctrl := gomock.NewController(t)
	workos := authmocks.NewMockUserManagement(ctrl)
	workos.EXPECT().GetLogoutURL(usermanagement.GetLogoutURLOpts{
		SessionID: "session_bearer",
		ReturnTo:  "zeta://login",
	}).Return(url.Parse(logoutBaseURL + "?session_id=session_bearer&return_to=zeta%3A%2F%2Flogin"))

	h := NewHandler(slog.Default(), nil, workos)

	req := httptest.NewRequest(http.MethodPost, "/auth/logout", nil)
	req = contextWithUser(req, &UserContext{ID: "user_1", SID: "session_bearer"})
	rec := httptest.NewRecorder()

	h.Logout(rec, req)

	require.Equal(t, http.StatusOK, rec.Code)
	var resp map[string]string
	require.NoError(t, json.NewDecoder(rec.Body).Decode(&resp))
	u := parseLogoutURL(t, resp["logoutUrl"])
	assert.Equal(t, "zeta://login", u.Query().Get("return_to"),
		"configured mobile return_to must reach WorkOS")
}

// TestLogout_NeitherCookieNorSID verifies graceful degradation when there is
// no cookie and no SID in context (unauthenticated or already-expired token):
// the response is still 200 with the frontend URL so the client can sign out locally.
func TestLogout_NeitherCookieNorSID(t *testing.T) {
	t.Setenv("DEV_AUTH_ENABLED", "true")
	t.Setenv("FRONTEND_URL", "https://app.example.test")

	ctrl := gomock.NewController(t)
	workos := authmocks.NewMockUserManagement(ctrl)
	// GetLogoutURL must NOT be called.

	h := NewHandler(slog.Default(), nil, workos)

	req := httptest.NewRequest(http.MethodPost, "/auth/logout", nil)
	// No cookie, no user context.
	rec := httptest.NewRecorder()

	h.Logout(rec, req)

	require.Equal(t, http.StatusOK, rec.Code)
	var resp map[string]string
	require.NoError(t, json.NewDecoder(rec.Body).Decode(&resp))
	assert.Equal(t, "https://app.example.test", resp["logoutUrl"])
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

// contextWithUser injects a UserContext into the request context so that
// handler tests can exercise Me/UpdateMe without running the JWT middleware.
func contextWithUser(r *http.Request, u *UserContext) *http.Request {
	return r.WithContext(context.WithValue(r.Context(), UserKey, u))
}

// testUserPrefs returns a fully-populated UserPreference row suitable for
// handler response assertions.
func testUserPrefs() db.UserPreference {
	return db.UserPreference{
		UserID:    "user-1",
		FirstName: "Alice",
		LastName:  "Smith",
		// Push fields
		PushNotificationsEnabled:          true,
		PushAssetUploadsEnabled:           true,
		PushAssetReviewsEnabled:           false,
		PushInvitationUpdatesEnabled:      true,
		PushGroupMembershipUpdatesEnabled: false,
		PushCoachingBookingUpdatesEnabled: true,
	}
}

func TestMe_IncludesPushPreferences(t *testing.T) {
	ctrl := gomock.NewController(t)
	q := dbmocks.NewMockQuerier(ctrl)
	q.EXPECT().
		GetUserPreferences(gomock.Any(), "user-1").
		Return(testUserPrefs(), nil)

	workos := authmocks.NewMockUserManagement(ctrl)
	h := NewHandler(slog.Default(), q, workos)

	req := httptest.NewRequest(http.MethodGet, "/auth/me", nil)
	req = contextWithUser(req, &UserContext{ID: "user-1", Role: "student", Permissions: []string{}})
	rec := httptest.NewRecorder()

	h.Me(rec, req)

	require.Equal(t, http.StatusOK, rec.Code)
	var body map[string]json.RawMessage
	require.NoError(t, json.NewDecoder(rec.Body).Decode(&body))
	require.Contains(t, body, "push_preferences", "response must contain push_preferences")

	var pp preferences.PushPreferences
	require.NoError(t, json.Unmarshal(body["push_preferences"], &pp))
	assert.True(t, pp.NotificationsEnabled)
	assert.True(t, pp.AssetUploadsEnabled)
	assert.False(t, pp.AssetReviewsEnabled)
	assert.True(t, pp.InvitationUpdatesEnabled)
	assert.False(t, pp.GroupMembershipUpdatesEnabled)
	assert.True(t, pp.CoachingBookingUpdatesEnabled)
}

func TestUpdateMe_PersistsPushPreferences(t *testing.T) {
	ctrl := gomock.NewController(t)
	q := dbmocks.NewMockQuerier(ctrl)

	basePrefs := testUserPrefs()

	updatedPrefs := basePrefs
	updatedPrefs.PushNotificationsEnabled = false
	updatedPrefs.PushAssetUploadsEnabled = false

	q.EXPECT().
		UpdateUserProfilePreferences(gomock.Any(), gomock.Any()).
		Return(basePrefs, nil)

	q.EXPECT().
		UpdateUserPushPreferences(gomock.Any(), db.UpdateUserPushPreferencesParams{
			UserID:                            "user-1",
			PushNotificationsEnabled:          false,
			PushAssetUploadsEnabled:           false,
			PushAssetReviewsEnabled:           false,
			PushInvitationUpdatesEnabled:      false,
			PushGroupMembershipUpdatesEnabled: false,
			PushCoachingBookingUpdatesEnabled: false,
		}).
		Return(updatedPrefs, nil)

	workos := authmocks.NewMockUserManagement(ctrl)
	workos.EXPECT().UpdateUser(gomock.Any(), gomock.Any()).Return(usermanagement.User{}, nil).AnyTimes()

	h := NewHandler(slog.Default(), q, workos)

	body := strings.NewReader(`{
		"timezone": "UTC",
		"push_preferences": {
			"notifications_enabled": false,
			"asset_uploads_enabled": false,
			"asset_reviews_enabled": false,
			"invitation_updates_enabled": false,
			"group_membership_updates_enabled": false,
			"coaching_booking_updates_enabled": false
		}
	}`)
	req := httptest.NewRequest(http.MethodPut, "/auth/me", body)
	req = contextWithUser(req, &UserContext{ID: "user-1", Role: "student", Permissions: []string{}})
	rec := httptest.NewRecorder()

	h.UpdateMe(rec, req)

	require.Equal(t, http.StatusOK, rec.Code)
	var resp map[string]json.RawMessage
	require.NoError(t, json.NewDecoder(rec.Body).Decode(&resp))
	require.Contains(t, resp, "push_preferences")

	var pp preferences.PushPreferences
	require.NoError(t, json.Unmarshal(resp["push_preferences"], &pp))
	assert.False(t, pp.NotificationsEnabled)
	assert.False(t, pp.AssetUploadsEnabled)
}
