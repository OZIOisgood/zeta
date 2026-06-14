package auth

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	neturl "net/url"
	"os"
	"strings"
	"time"

	"github.com/OZIOisgood/zeta/internal/db"
	"github.com/OZIOisgood/zeta/internal/permissions"
	"github.com/OZIOisgood/zeta/internal/preferences"
	"github.com/OZIOisgood/zeta/internal/tools"
	"github.com/golang-jwt/jwt/v5"
	"github.com/jackc/pgx/v5"
	"github.com/workos/workos-go/v4/pkg/usermanagement"
)

const CookieName = "zeta_session"
const RefreshCookieName = "zeta_refresh"
const AuthStateCookieName = "zeta_auth_state"
const authStateCookiePath = "/"
const legacyAuthStateCookiePath = "/auth"

const authStateTTL = 10 * time.Minute

type authReturnState struct {
	State     string    `json:"state"`
	ReturnTo  string    `json:"return_to"`
	ExpiresAt time.Time `json:"expires_at"`
}

// cookieSecure returns false when DEV_AUTH_ENABLED is set, so that HttpOnly
// cookies work over plain HTTP during local development. In production the
// flag is never set, so Secure=true is always used.
func cookieSecure() bool {
	return os.Getenv("DEV_AUTH_ENABLED") != "true"
}

// cookieSameSite returns SameSiteLaxMode for local HTTP development (where
// SameSiteNone requires Secure=true and would be rejected by browsers) and
// SameSiteNoneMode for production (cross-site API ↔ frontend on different origins).
func cookieSameSite() http.SameSite {
	if os.Getenv("DEV_AUTH_ENABLED") == "true" {
		return http.SameSiteLaxMode
	}
	return http.SameSiteNoneMode
}

func setSessionCookies(w http.ResponseWriter, accessToken, refreshToken string, includeExpires bool) {
	accessCookie := &http.Cookie{
		Name:     CookieName,
		Value:    accessToken,
		Path:     "/",
		HttpOnly: true,
		Secure:   cookieSecure(),
		SameSite: cookieSameSite(),
	}
	refreshCookie := &http.Cookie{
		Name:     RefreshCookieName,
		Value:    refreshToken,
		Path:     "/",
		HttpOnly: true,
		Secure:   cookieSecure(),
		SameSite: cookieSameSite(),
	}
	if includeExpires {
		accessCookie.Expires = time.Now().Add(24 * time.Hour)
		refreshCookie.Expires = time.Now().Add(7 * 24 * time.Hour)
	}
	http.SetCookie(w, accessCookie)
	http.SetCookie(w, refreshCookie)
}

func setAuthStateCookie(w http.ResponseWriter, state authReturnState) error {
	payload, err := json.Marshal(state)
	if err != nil {
		return err
	}

	clearLegacyAuthStateCookie(w)
	http.SetCookie(w, &http.Cookie{
		Name:     AuthStateCookieName,
		Value:    base64.RawURLEncoding.EncodeToString(payload),
		Path:     authStateCookiePath,
		HttpOnly: true,
		Secure:   cookieSecure(),
		SameSite: cookieSameSite(),
		Expires:  state.ExpiresAt,
		MaxAge:   int(time.Until(state.ExpiresAt).Seconds()),
	})
	return nil
}

func clearAuthStateCookie(w http.ResponseWriter) {
	http.SetCookie(w, &http.Cookie{
		Name:     AuthStateCookieName,
		Value:    "",
		Path:     authStateCookiePath,
		Expires:  time.Now().Add(-1 * time.Hour),
		MaxAge:   -1,
		HttpOnly: true,
		Secure:   cookieSecure(),
		SameSite: cookieSameSite(),
	})
	clearLegacyAuthStateCookie(w)
}

func clearLegacyAuthStateCookie(w http.ResponseWriter) {
	http.SetCookie(w, &http.Cookie{
		Name:     AuthStateCookieName,
		Value:    "",
		Path:     legacyAuthStateCookiePath,
		Expires:  time.Now().Add(-1 * time.Hour),
		MaxAge:   -1,
		HttpOnly: true,
		Secure:   cookieSecure(),
		SameSite: cookieSameSite(),
	})
}

func readAuthStateCookie(r *http.Request) (authReturnState, bool, error) {
	cookie, err := r.Cookie(AuthStateCookieName)
	if err == http.ErrNoCookie {
		return authReturnState{}, false, nil
	}
	if err != nil {
		return authReturnState{}, false, err
	}

	data, err := base64.RawURLEncoding.DecodeString(cookie.Value)
	if err != nil {
		return authReturnState{}, true, err
	}

	var state authReturnState
	if err := json.Unmarshal(data, &state); err != nil {
		return authReturnState{}, true, err
	}

	return state, true, nil
}

func randomAuthState() (string, error) {
	var bytes [32]byte
	if _, err := rand.Read(bytes[:]); err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(bytes[:]), nil
}

func validReturnTo(value string) (string, bool) {
	if value == "" {
		return "", false
	}
	if !strings.HasPrefix(value, "/") || strings.HasPrefix(value, "//") {
		return "", false
	}
	if strings.Contains(value, "\\") || strings.ContainsAny(value, "\r\n\t") {
		return "", false
	}

	parsed, err := neturl.Parse(value)
	if err != nil || parsed.IsAbs() || parsed.Host != "" {
		return "", false
	}

	return value, true
}

func frontendRedirectURL(returnTo string) string {
	frontendURL := os.Getenv("FRONTEND_URL")
	if frontendURL == "" {
		frontendURL = "http://localhost:4200"
	}
	return strings.TrimRight(frontendURL, "/") + returnTo
}

type Handler struct {
	logger *slog.Logger
	q      db.Querier
	workos UserManagement
}

func NewHandler(logger *slog.Logger, q db.Querier, workos UserManagement) *Handler {
	usermanagement.SetAPIKey(os.Getenv("WORKOS_API_KEY"))
	return &Handler{
		logger: logger,
		q:      q,
		workos: workos,
	}
}

func (h *Handler) Login(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	h.logger.InfoContext(ctx, "auth_login_initiated",
		slog.String("component", "auth"),
	)

	clientID := os.Getenv("WORKOS_CLIENT_ID")
	redirectURI := os.Getenv("WORKOS_REDIRECT_URI")
	returnTo := ""
	state := ""
	if rawReturnTo := r.URL.Query().Get("return_to"); rawReturnTo != "" {
		validatedReturnTo, ok := validReturnTo(rawReturnTo)
		if !ok {
			h.logger.WarnContext(ctx, "auth_login_invalid_return_to",
				slog.String("component", "auth"),
			)
			http.Error(w, "Invalid return target", http.StatusBadRequest)
			return
		}

		generatedState, err := randomAuthState()
		if err != nil {
			h.logger.ErrorContext(ctx, "auth_state_generation_failed",
				slog.String("component", "auth"),
				slog.Any("err", err),
			)
			http.Error(w, "Failed to prepare login", http.StatusInternalServerError)
			return
		}

		returnTo = validatedReturnTo
		state = generatedState
		if err := setAuthStateCookie(w, authReturnState{
			State:     generatedState,
			ReturnTo:  validatedReturnTo,
			ExpiresAt: time.Now().Add(authStateTTL),
		}); err != nil {
			h.logger.ErrorContext(ctx, "auth_state_cookie_set_failed",
				slog.String("component", "auth"),
				slog.Any("err", err),
			)
			http.Error(w, "Failed to prepare login", http.StatusInternalServerError)
			return
		}
	}

	url, err := h.workos.GetAuthorizationURL(usermanagement.GetAuthorizationURLOpts{
		ClientID:    clientID,
		RedirectURI: redirectURI,
		Provider:    "authkit",
		State:       state,
	})
	if err != nil {
		h.logger.ErrorContext(ctx, "auth_get_url_failed",
			slog.String("component", "auth"),
			slog.Any("err", err),
		)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	if returnTo != "" {
		h.logger.InfoContext(ctx, "auth_login_return_state_prepared",
			slog.String("component", "auth"),
		)
	}

	http.Redirect(w, r, url.String(), http.StatusSeeOther)
}

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

func (h *Handler) Callback(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	code := r.URL.Query().Get("code")
	if code == "" {
		h.logger.WarnContext(ctx, "auth_callback_no_code",
			slog.String("component", "auth"),
		)
		http.Error(w, "No code provided", http.StatusBadRequest)
		return
	}

	returnTo := ""
	callbackState := r.URL.Query().Get("state")
	storedState, hasStoredState, err := readAuthStateCookie(r)
	if err != nil {
		clearAuthStateCookie(w)
		h.logger.WarnContext(ctx, "auth_callback_state_cookie_invalid",
			slog.String("component", "auth"),
			slog.Any("err", err),
		)
		http.Error(w, "Invalid auth state", http.StatusBadRequest)
		return
	}
	if hasStoredState || callbackState != "" {
		clearAuthStateCookie(w)
		if !hasStoredState || callbackState == "" || callbackState != storedState.State || time.Now().After(storedState.ExpiresAt) {
			h.logger.WarnContext(ctx, "auth_callback_state_mismatch",
				slog.String("component", "auth"),
			)
			http.Error(w, "Invalid auth state", http.StatusBadRequest)
			return
		}
		if validatedReturnTo, ok := validReturnTo(storedState.ReturnTo); ok {
			returnTo = validatedReturnTo
		}
	}

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

	// Extract Session ID from WorkOS Access Token (needed for logout URL later)
	var claims jwt.MapClaims
	_, _, err = jwt.NewParser().ParseUnverified(accessToken, &claims)
	if err != nil {
		h.logger.ErrorContext(ctx, "auth_token_parse_failed",
			slog.String("component", "auth"),
			slog.Any("err", err),
		)
		http.Error(w, "Failed to parse access token: "+err.Error(), http.StatusInternalServerError)
		return
	}

	sid, ok := claims["sid"].(string)
	if !ok || sid == "" {
		h.logger.WarnContext(ctx, "auth_sid_missing",
			slog.String("component", "auth"),
		)
	}

	// Store WorkOS tokens directly. The middleware validates the access token via JWKS.
	setSessionCookies(w, accessToken, refreshToken, true)

	h.logger.InfoContext(ctx, "auth_login_succeeded",
		slog.String("component", "auth"),
		slog.String("user_id", tokens.UserID),
	)

	http.Redirect(w, r, frontendRedirectURL(returnTo), http.StatusSeeOther)
}

func (h *Handler) Logout(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	// 1. Clear local cookies
	cookie, cookieErr := r.Cookie(CookieName)
	http.SetCookie(w, &http.Cookie{
		Name:     CookieName,
		Value:    "",
		Path:     "/",
		Expires:  time.Now().Add(-1 * time.Hour),
		HttpOnly: true,
		Secure:   cookieSecure(),
		SameSite: cookieSameSite(),
	})
	http.SetCookie(w, &http.Cookie{
		Name:     RefreshCookieName,
		Value:    "",
		Path:     "/",
		Expires:  time.Now().Add(-1 * time.Hour),
		HttpOnly: true,
		Secure:   cookieSecure(),
		SameSite: cookieSameSite(),
	})

	// 2. Resolve the WorkOS session ID.
	//
	// Web callers send the access token in a cookie; Bearer/mobile callers have
	// no cookie but the JWT middleware has already validated their token and
	// populated UserContext.SID. We try the cookie path first (preserving the
	// existing web behaviour), then fall back to the context user so that mobile
	// callers also have their WorkOS session revoked.
	var sid string
	var isBearerCaller bool

	if cookieErr == nil && cookie.Value != "" {
		var logoutClaims jwt.MapClaims
		_, _, _ = jwt.NewParser().ParseUnverified(cookie.Value, &logoutClaims)
		sid, _ = logoutClaims["sid"].(string)
	} else {
		if cookieErr != nil {
			h.logger.WarnContext(ctx, "auth_logout_no_cookie",
				slog.String("component", "auth"),
				slog.Any("err", cookieErr),
			)
		} else {
			h.logger.WarnContext(ctx, "auth_logout_empty_cookie",
				slog.String("component", "auth"),
			)
		}
		// Fall back to the SID populated by the JWT middleware for Bearer callers.
		if u := GetUser(ctx); u != nil && u.SID != "" {
			sid = u.SID
			isBearerCaller = true
		}
	}

	// 3. Determine redirect / logout URL.
	frontendURL := os.Getenv("FRONTEND_URL")
	if frontendURL == "" {
		frontendURL = "http://localhost:4200"
	}
	redirectTarget := frontendURL

	if sid != "" {
		// For Bearer/mobile callers we do not supply a ReturnTo: there is no
		// browser session to redirect after WorkOS terminates the server-side
		// session. Web callers keep the existing behaviour of returning to the
		// frontend URL.
		returnTo := frontendURL
		if isBearerCaller {
			returnTo = ""
		}
		logoutURL, err := h.workos.GetLogoutURL(usermanagement.GetLogoutURLOpts{
			SessionID: sid,
			ReturnTo:  returnTo,
		})
		if err != nil {
			h.logger.ErrorContext(ctx, "auth_logout_url_failed",
				slog.String("component", "auth"),
				slog.Any("err", err),
			)
		} else {
			redirectTarget = logoutURL.String()
		}
	}

	h.logger.InfoContext(ctx, "auth_logout_succeeded",
		slog.String("component", "auth"),
	)

	// 4. Return the logout URL as JSON instead of redirecting.
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"logoutUrl": redirectTarget,
	})
}

func (h *Handler) getDefaultOrgID() string {
	return os.Getenv("DEFAULT_ORG_ID")
}

func (h *Handler) refreshSessionForDefaultOrg(ctx context.Context, refreshToken string) (usermanagement.RefreshAuthenticationResponse, error) {
	defaultOrgID := h.getDefaultOrgID()
	if defaultOrgID == "" {
		return usermanagement.RefreshAuthenticationResponse{}, fmt.Errorf("DEFAULT_ORG_ID is not configured")
	}
	if refreshToken == "" {
		return usermanagement.RefreshAuthenticationResponse{}, fmt.Errorf("refresh token is empty")
	}

	return h.workos.AuthenticateWithRefreshToken(ctx, usermanagement.AuthenticateWithRefreshTokenOpts{
		ClientID:       os.Getenv("WORKOS_CLIENT_ID"),
		RefreshToken:   refreshToken,
		OrganizationID: defaultOrgID,
	})
}

// getPermissionsForRole fetches the permissions for a given role slug from WorkOS.
// The Go SDK's roles.Role struct does not include Permissions, so we call the
// WorkOS REST API directly and decode into a custom response struct.
func (h *Handler) getPermissionsForRole(ctx context.Context, roleSlug string) ([]string, error) {
	orgID := h.getDefaultOrgID()
	if orgID == "" {
		return nil, fmt.Errorf("DEFAULT_ORG_ID is not configured")
	}
	apiKey := os.Getenv("WORKOS_API_KEY")

	url := fmt.Sprintf("https://api.workos.com/organizations/%s/roles", orgID)
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+apiKey)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch organization roles: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("WorkOS API returned status %d", resp.StatusCode)
	}

	var result struct {
		Data []struct {
			Slug        string   `json:"slug"`
			Permissions []string `json:"permissions"`
		} `json:"data"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("failed to decode roles response: %w", err)
	}

	for _, role := range result.Data {
		if role.Slug == roleSlug {
			return role.Permissions, nil
		}
	}

	return []string{}, nil
}

func (h *Handler) ensureUserInOrg(ctx context.Context, userID string) (string, []string, error) {
	defaultOrgID := h.getDefaultOrgID()
	if defaultOrgID == "" {
		return "", nil, fmt.Errorf("DEFAULT_ORG_ID is not configured")
	}

	// 1. Check existing memberships
	memberships, err := h.workos.ListOrganizationMemberships(ctx, usermanagement.ListOrganizationMembershipsOpts{
		OrganizationID: defaultOrgID,
		UserID:         userID,
	})
	if err != nil {
		return "", nil, err
	}

	if len(memberships.Data) > 0 {
		roleSlug := memberships.Data[0].Role.Slug
		perms, err := h.getPermissionsForRole(ctx, roleSlug)
		if err != nil {
			return roleSlug, nil, fmt.Errorf("failed to fetch permissions: %w", err)
		}
		return roleSlug, perms, nil
	}

	// 2. Add to Default Org
	role := permissions.RoleStudent

	_, err = h.workos.CreateOrganizationMembership(ctx, usermanagement.CreateOrganizationMembershipOpts{
		OrganizationID: defaultOrgID,
		UserID:         userID,
		RoleSlug:       role,
	})
	if err != nil {
		return "", nil, fmt.Errorf("failed to add user to org: %w", err)
	}

	perms, err := h.getPermissionsForRole(ctx, role)
	if err != nil {
		return role, nil, fmt.Errorf("failed to fetch permissions: %w", err)
	}
	return role, perms, nil
}

func (h *Handler) Me(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	user := GetUser(ctx)
	if user == nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// Ensure User is in Organization and get Role + Permissions from WorkOS
	// Only call ensureUserInOrg when the JWT has no role yet (first login or role not persisted).
	// Calling it on every /auth/me request would incur a WorkOS API call each time.
	currentRole := user.Role
	var newRole string
	var newPermissions []string

	if currentRole == "" {
		var err error
		newRole, newPermissions, err = h.ensureUserInOrg(ctx, user.ID)
		if err != nil {
			h.logger.ErrorContext(ctx, "auth_ensure_org_failed",
				slog.String("user_id", user.ID),
				slog.Any("err", err),
			)
		} else if refreshCookie, cookieErr := r.Cookie(RefreshCookieName); cookieErr == nil && refreshCookie.Value != "" {
			if refreshResp, refreshErr := h.refreshSessionForDefaultOrg(ctx, refreshCookie.Value); refreshErr != nil {
				h.logger.WarnContext(ctx, "auth_org_session_refresh_failed",
					slog.String("component", "auth"),
					slog.String("user_id", user.ID),
					slog.Any("err", refreshErr),
				)
			} else {
				setSessionCookies(w, refreshResp.AccessToken, refreshResp.RefreshToken, true)
			}
		}
	} else {
		newRole = currentRole
		newPermissions = user.Permissions
	}

	// Always use latest role and permissions from JWT (validated by JWKS middleware)
	if newPermissions == nil {
		newPermissions = []string{}
	}
	user.Role = newRole
	user.Permissions = newPermissions

	// Fetch user preferences. This is the canonical display profile.
	prefs, err := h.q.GetUserPreferences(ctx, user.ID)
	if err != nil {
		if err == pgx.ErrNoRows {
			// No preferences yet means the user has just completed first signup.
			lang := tools.NegotiateLanguage(r.Header.Get("Accept-Language"))
			tz := "UTC"
			if raw := r.Header.Get("X-Timezone"); raw != "" {
				if _, tzErr := time.LoadLocation(raw); tzErr == nil {
					tz = raw
				}
			}

			avatar := ""
			if user.ProfilePictureUrl != "" {
				avatarB64, avatarErr := h.fetchURLAsBase64(user.ProfilePictureUrl)
				if avatarErr != nil {
					h.logger.WarnContext(ctx, "auth_seed_avatar_failed",
						slog.String("component", "auth"),
						slog.String("user_id", user.ID),
						slog.Any("err", avatarErr),
					)
				} else {
					avatar = avatarB64
				}
			}

			if avatar != "" {
				prefs, err = h.q.SeedUserPreferencesWithAvatar(ctx, db.SeedUserPreferencesWithAvatarParams{
					UserID:    user.ID,
					Language:  db.LanguageCode(lang),
					Timezone:  tz,
					FirstName: user.FirstName,
					LastName:  user.LastName,
					Avatar:    avatar,
				})
			} else {
				prefs, err = h.q.SeedUserPreferences(ctx, db.SeedUserPreferencesParams{
					UserID:    user.ID,
					Language:  db.LanguageCode(lang),
					Timezone:  tz,
					FirstName: user.FirstName,
					LastName:  user.LastName,
				})
			}
			if err != nil {
				h.logger.ErrorContext(ctx, "auth_create_prefs_failed",
					slog.String("component", "auth"),
					slog.String("user_id", user.ID),
					slog.Any("err", err),
				)
				http.Error(w, "Failed to create user settings", http.StatusInternalServerError)
				return
			}
		} else {
			h.logger.ErrorContext(ctx, "auth_get_prefs_failed",
				slog.String("component", "auth"),
				slog.Any("err", err),
			)
			http.Error(w, "Failed to get user settings", http.StatusInternalServerError)
			return
		}
	}

	// Construct response using local preferences for display profile fields.
	resp := map[string]interface{}{
		"id":                user.ID,
		"first_name":        prefs.FirstName,
		"last_name":         prefs.LastName,
		"email":             user.Email,
		"language":          prefs.Language,
		"avatar":            prefs.Avatar,
		"timezone":          prefs.Timezone,
		"email_preferences": preferences.FromUserPreferences(prefs),
		"push_preferences":  preferences.FromUserPreferencesPush(prefs),
		"role":              user.Role,
		"permissions":       user.Permissions,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}

type UpdateUserRequest struct {
	FirstName        string                        `json:"first_name"`
	LastName         string                        `json:"last_name"`
	Language         string                        `json:"language"`
	Avatar           *string                       `json:"avatar"`
	Timezone         string                        `json:"timezone"`
	EmailPreferences *preferences.EmailPreferences `json:"email_preferences"`
	PushPreferences  *preferences.PushPreferences  `json:"push_preferences"`
}

func (h *Handler) UpdateMe(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	user := GetUser(ctx)
	if user == nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	var req UpdateUserRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.Timezone == "" {
		http.Error(w, "Timezone is required", http.StatusBadRequest)
		return
	}
	if _, tzErr := time.LoadLocation(req.Timezone); tzErr != nil {
		http.Error(w, "Invalid timezone", http.StatusBadRequest)
		return
	}

	prefs, err := h.q.UpdateUserProfilePreferences(ctx, db.UpdateUserProfilePreferencesParams{
		UserID:    user.ID,
		Language:  db.LanguageCode(req.Language),
		Timezone:  req.Timezone,
		FirstName: req.FirstName,
		LastName:  req.LastName,
	})
	if err != nil {
		h.logger.ErrorContext(ctx, "auth_update_profile_preferences_failed",
			slog.String("component", "auth"),
			slog.String("user_id", user.ID),
			slog.Any("err", err),
		)
		http.Error(w, "Failed to update profile settings", http.StatusInternalServerError)
		return
	}

	if req.EmailPreferences != nil {
		updated, err := h.q.UpdateUserEmailPreferences(ctx, preferences.ToUpdateParams(user.ID, *req.EmailPreferences))
		if err != nil {
			h.logger.ErrorContext(ctx, "auth_update_email_preferences_failed",
				slog.String("component", "auth"),
				slog.String("user_id", user.ID),
				slog.Any("err", err),
			)
			http.Error(w, "Failed to update email preferences", http.StatusInternalServerError)
			return
		}
		prefs = updated
	}

	if req.PushPreferences != nil {
		updated, err := h.q.UpdateUserPushPreferences(ctx, preferences.ToUpdatePushParams(user.ID, *req.PushPreferences))
		if err != nil {
			h.logger.ErrorContext(ctx, "auth_update_push_preferences_failed",
				slog.String("component", "auth"),
				slog.String("user_id", user.ID),
				slog.Any("err", err),
			)
			http.Error(w, "Failed to update push preferences", http.StatusInternalServerError)
			return
		}
		prefs = updated
	}

	if req.Avatar != nil {
		updated, err := h.q.UpdateUserAvatar(ctx, db.UpdateUserAvatarParams{
			UserID: user.ID,
			Avatar: *req.Avatar,
		})
		if err != nil {
			h.logger.ErrorContext(ctx, "auth_update_avatar_failed",
				slog.String("component", "auth"),
				slog.String("user_id", user.ID),
				slog.Any("err", err),
			)
			http.Error(w, "Failed to update avatar", http.StatusInternalServerError)
			return
		}
		prefs = updated
	}

	// Try to update WorkOS user
	go func() {
		// Update WorkOS user
		_, err := h.workos.UpdateUser(context.Background(), usermanagement.UpdateUserOpts{
			User:      user.ID,
			FirstName: req.FirstName,
			LastName:  req.LastName,
		})
		if err != nil {
			h.logger.ErrorContext(context.Background(), "auth_workos_update_failed",
				slog.String("component", "auth"),
				slog.String("user_id", user.ID),
				slog.Any("err", err),
			)
		}
	}()

	h.logger.InfoContext(ctx, "auth_user_updated",
		slog.String("component", "auth"),
		slog.String("user_id", user.ID),
	)

	// Refresh the session cookie so that the updated name is reflected immediately.
	// We use the stored refresh token to obtain a new WorkOS AccessToken (RS256).
	if refreshCookie, err := r.Cookie(RefreshCookieName); err == nil && refreshCookie.Value != "" {
		clientID := os.Getenv("WORKOS_CLIENT_ID")
		refreshResp, err := h.workos.AuthenticateWithRefreshToken(ctx, usermanagement.AuthenticateWithRefreshTokenOpts{
			ClientID:     clientID,
			RefreshToken: refreshCookie.Value,
		})
		if err != nil {
			h.logger.WarnContext(ctx, "auth_token_refresh_failed",
				slog.String("component", "auth"),
				slog.String("user_id", user.ID),
				slog.Any("err", err),
			)
		} else {
			setSessionCookies(w, refreshResp.AccessToken, refreshResp.RefreshToken, false)
		}
	}

	resp := map[string]interface{}{
		"id":                user.ID,
		"first_name":        prefs.FirstName,
		"last_name":         prefs.LastName,
		"email":             user.Email,
		"language":          prefs.Language,
		"avatar":            prefs.Avatar,
		"timezone":          prefs.Timezone,
		"email_preferences": preferences.FromUserPreferences(prefs),
		"push_preferences":  preferences.FromUserPreferencesPush(prefs),
		"role":              user.Role,
		"permissions":       user.Permissions,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}

// DevToken issues a WorkOS RS256 access token for a given email/password via WorkOS Password Auth.
// The returned token can be used directly as a Bearer token — the middleware validates it via JWKS.
// This endpoint is only available when DEV_AUTH_ENABLED=true and must never be enabled in production.
func (h *Handler) DevToken(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	var req struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}
	if req.Email == "" || req.Password == "" {
		http.Error(w, "email and password are required", http.StatusBadRequest)
		return
	}

	clientID := os.Getenv("WORKOS_CLIENT_ID")
	resp, err := h.workos.AuthenticateWithPassword(ctx, usermanagement.AuthenticateWithPasswordOpts{
		ClientID: clientID,
		Email:    req.Email,
		Password: req.Password,
	})
	if err != nil {
		h.logger.ErrorContext(ctx, "dev_token_auth_failed",
			slog.String("email", req.Email),
			slog.Any("err", err),
		)
		http.Error(w, "Authentication failed: "+err.Error(), http.StatusUnauthorized)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"token": resp.AccessToken})
}

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

	// The refresh response carries no user object; extract the user ID from
	// the freshly issued access token (same trust as Callback's sid parse).
	logAttrs := []any{slog.String("component", "auth")}
	var refreshClaims jwt.MapClaims
	if _, _, err := jwt.NewParser().ParseUnverified(resp.AccessToken, &refreshClaims); err == nil {
		if userID, ok := refreshClaims["sub"].(string); ok && userID != "" {
			logAttrs = append(logAttrs, slog.String("user_id", userID))
		}
	}

	h.logger.InfoContext(ctx, "auth_token_refresh_succeeded", logAttrs...)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(tokenPairResponse{
		AccessToken:  resp.AccessToken,
		RefreshToken: resp.RefreshToken,
	})
}

// fetchURLAsBase64 downloads the content at url and returns it as a base64-encoded string.
func (h *Handler) fetchURLAsBase64(url string) (string, error) {
	resp, err := http.Get(url) // #nosec G107 — URL comes from WorkOS API response
	if err != nil {
		return "", fmt.Errorf("fetch avatar: %w", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("fetch avatar: unexpected status %d", resp.StatusCode)
	}
	data, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("fetch avatar: read body: %w", err)
	}
	return base64.StdEncoding.EncodeToString(data), nil
}
