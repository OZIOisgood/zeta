package auth

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"os"
	"time"

	"github.com/OZIOisgood/zeta/internal/db"
	"github.com/OZIOisgood/zeta/internal/permissions"
	"github.com/OZIOisgood/zeta/internal/tools"
	"github.com/golang-jwt/jwt/v5"
	"github.com/jackc/pgx/v5"
	"github.com/workos/workos-go/v4/pkg/usermanagement"
)

const CookieName = "zeta_session"

type Handler struct {
	logger *slog.Logger
	q      *db.Queries
}

func NewHandler(logger *slog.Logger, q *db.Queries) *Handler {
	usermanagement.SetAPIKey(os.Getenv("WORKOS_API_KEY"))
	return &Handler{
		logger: logger,
		q:      q,
	}
}

func (h *Handler) Login(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	h.logger.InfoContext(ctx, "auth_login_initiated",
		slog.String("component", "auth"),
	)

	clientID := os.Getenv("WORKOS_CLIENT_ID")
	redirectURI := os.Getenv("WORKOS_REDIRECT_URI")

	url, err := usermanagement.GetAuthorizationURL(usermanagement.GetAuthorizationURLOpts{
		ClientID:    clientID,
		RedirectURI: redirectURI,
		Provider:    "authkit",
	})
	if err != nil {
		h.logger.ErrorContext(ctx, "auth_get_url_failed",
			slog.String("component", "auth"),
			slog.Any("err", err),
		)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	http.Redirect(w, r, url.String(), http.StatusSeeOther)
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

	clientID := os.Getenv("WORKOS_CLIENT_ID")

	resp, err := usermanagement.AuthenticateWithCode(ctx, usermanagement.AuthenticateWithCodeOpts{
		ClientID: clientID,
		Code:     code,
	})
	if err != nil {
		h.logger.ErrorContext(ctx, "auth_authenticate_failed",
			slog.String("component", "auth"),
			slog.Any("err", err),
		)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Extract Session ID from WorkOS Access Token
	var claims jwt.MapClaims
	_, _, err = jwt.NewParser().ParseUnverified(resp.AccessToken, &claims)
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

	// Fetch Role and Permissions from WorkOS
	role := ""
	var userPermissions []string
	memberships, err := usermanagement.ListOrganizationMemberships(ctx, usermanagement.ListOrganizationMembershipsOpts{
		UserID: resp.User.ID,
	})
	if err == nil && len(memberships.Data) > 0 {
		role = memberships.Data[0].Role.Slug
		userPermissions, err = h.getPermissionsForRole(ctx, role)
		if err != nil {
			h.logger.WarnContext(ctx, "auth_fetch_permissions_failed",
				slog.String("user_id", resp.User.ID),
				slog.String("role", role),
				slog.Any("err", err),
			)
			userPermissions = []string{}
		}
	} else if err != nil {
		h.logger.WarnContext(ctx, "auth_fetch_role_failed",
			slog.String("user_id", resp.User.ID),
			slog.Any("err", err),
		)
	}

	// Seed avatar from WorkOS only on first sign-in (no preferences row yet).
	// If a row already exists, the DB avatar is the source of truth.
	go func() {
		_, err := h.q.GetUserPreferences(context.Background(), resp.User.ID)
		if err == nil {
			// Row exists — keep the DB avatar as-is
			return
		}
		if err != pgx.ErrNoRows {
			h.logger.WarnContext(context.Background(), "auth_seed_avatar_check_failed",
				slog.String("user_id", resp.User.ID),
				slog.Any("err", err),
			)
			return
		}
		// No preferences row yet — seed avatar from WorkOS if available
		avatar := ""
		if resp.User.ProfilePictureURL != "" {
			avatarB64, err := h.fetchURLAsBase64(resp.User.ProfilePictureURL)
			if err != nil {
				h.logger.WarnContext(context.Background(), "auth_seed_avatar_failed",
					slog.String("user_id", resp.User.ID),
					slog.Any("err", err),
				)
			} else {
				avatar = avatarB64
			}
		}
		if avatar != "" {
			_, err = h.q.UpsertUserAvatar(context.Background(), db.UpsertUserAvatarParams{
				UserID: resp.User.ID,
				Avatar: avatar,
			})
			if err != nil {
				h.logger.WarnContext(context.Background(), "auth_seed_avatar_save_failed",
					slog.String("user_id", resp.User.ID),
					slog.Any("err", err),
				)
			}
		}
	}()

	// Create JWT
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"sub":         resp.User.ID,
		"email":       resp.User.Email,
		"first_name":  resp.User.FirstName,
		"last_name":   resp.User.LastName,
		"sid":         sid,
		"role":        role,
		"permissions": userPermissions,
		"exp":         time.Now().Add(24 * time.Hour).Unix(),
	})

	secret := []byte(os.Getenv("WORKOS_COOKIE_SECRET"))
	if len(secret) == 0 {
		h.logger.ErrorContext(ctx, "auth_secret_missing",
			slog.String("component", "auth"),
		)
		http.Error(w, "WORKOS_COOKIE_SECRET is not set", http.StatusInternalServerError)
		return
	}

	tokenString, err := token.SignedString(secret)
	if err != nil {
		h.logger.ErrorContext(ctx, "auth_token_sign_failed",
			slog.String("component", "auth"),
			slog.Any("err", err),
		)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	http.SetCookie(w, &http.Cookie{
		Name:     CookieName,
		Value:    tokenString,
		Path:     "/",
		Expires:  time.Now().Add(24 * time.Hour),
		HttpOnly: true,
		Secure:   true,
		SameSite: http.SameSiteNoneMode,
	})

	h.logger.InfoContext(ctx, "auth_login_succeeded",
		slog.String("component", "auth"),
		slog.String("user_id", resp.User.ID),
	)

	frontendURL := os.Getenv("FRONTEND_URL")
	if frontendURL == "" {
		frontendURL = "http://localhost:4200"
	}
	http.Redirect(w, r, frontendURL, http.StatusSeeOther)
}

func (h *Handler) Logout(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	// 1. Clear local cookie
	cookie, err := r.Cookie(CookieName)
	http.SetCookie(w, &http.Cookie{
		Name:     CookieName,
		Value:    "",
		Path:     "/",
		Expires:  time.Now().Add(-1 * time.Hour),
		HttpOnly: true,
		Secure:   true,
		SameSite: http.SameSiteNoneMode,
	})

	// 2. Determine redirect URL
	frontendURL := os.Getenv("FRONTEND_URL")
	if frontendURL == "" {
		frontendURL = "http://localhost:4200"
	}
	redirectTarget := frontendURL

	if err != nil {
		h.logger.WarnContext(ctx, "auth_logout_no_cookie",
			slog.String("component", "auth"),
			slog.Any("err", err),
		)
	} else if cookie.Value == "" {
		h.logger.WarnContext(ctx, "auth_logout_empty_cookie",
			slog.String("component", "auth"),
		)
	}

	if err == nil && cookie.Value != "" {
		tokenString := cookie.Value
		secret := []byte(os.Getenv("WORKOS_COOKIE_SECRET"))

		token, _ := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
			return secret, nil
		})

		if token != nil {
			if claims, ok := token.Claims.(jwt.MapClaims); ok {
				sid, ok := claims["sid"].(string)
				if !ok || sid == "" {
					h.logger.DebugContext(ctx, "auth_logout_no_sid",
						slog.String("component", "auth"),
					)
				} else {
					logoutURL, err := usermanagement.GetLogoutURL(usermanagement.GetLogoutURLOpts{
						SessionID: sid,
						ReturnTo:  frontendURL,
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
			}
		}
	}

	h.logger.InfoContext(ctx, "auth_logout_succeeded",
		slog.String("component", "auth"),
	)

	// 3. Return the logout URL as JSON instead of redirecting
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"logoutUrl": redirectTarget,
	})
}

func (h *Handler) getDefaultOrgID() string {
	return os.Getenv("DEFAULT_ORG_ID")
}

// getPermissionsForRole fetches the permissions for a given role slug from WorkOS.
// The Go SDK's roles.Role struct does not include Permissions, so we call the
// WorkOS REST API directly and decode into a custom response struct.
func (h *Handler) getPermissionsForRole(ctx context.Context, roleSlug string) ([]string, error) {
	orgID := h.getDefaultOrgID()
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
	// 1. Check existing memberships
	memberships, err := usermanagement.ListOrganizationMemberships(ctx, usermanagement.ListOrganizationMembershipsOpts{
		UserID: userID,
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
	defaultOrgID := h.getDefaultOrgID()
	role := permissions.RoleStudent

	_, err = usermanagement.CreateOrganizationMembership(ctx, usermanagement.CreateOrganizationMembershipOpts{
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
		}
	} else {
		newRole = currentRole
		newPermissions = user.Permissions
	}

	// Always refresh the cookie with latest role and permissions from WorkOS
	if newPermissions == nil {
		newPermissions = []string{}
	}
	user.Role = newRole
	user.Permissions = newPermissions

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"sub":         user.ID,
		"email":       user.Email,
		"first_name":  user.FirstName,
		"last_name":   user.LastName,
		"sid":         user.SID,
		"role":        newRole,
		"permissions": newPermissions,
		"exp":         time.Now().Add(24 * time.Hour).Unix(),
	})

	secret := []byte(os.Getenv("WORKOS_COOKIE_SECRET"))
	if len(secret) > 0 {
		tokenString, err := token.SignedString(secret)
		if err != nil {
			h.logger.ErrorContext(ctx, "auth_token_refresh_failed",
				slog.String("component", "auth"),
				slog.Any("err", err),
			)
		} else {
			http.SetCookie(w, &http.Cookie{
				Name:     CookieName,
				Value:    tokenString,
				Path:     "/",
				Expires:  time.Now().Add(24 * time.Hour),
				HttpOnly: true,
				Secure:   true,
				SameSite: http.SameSiteNoneMode,
			})
		}
	}

	// Fetch user preferences (language + avatar)
	prefs, err := h.q.GetUserPreferences(ctx, user.ID)
	if err != nil {
		if err == pgx.ErrNoRows {
			// No preferences yet, create default
			lang := tools.NegotiateLanguage(r.Header.Get("Accept-Language"))
			prefs, err = h.q.UpsertUserPreferences(ctx, db.UpsertUserPreferencesParams{
				UserID:   user.ID,
				Language: db.LanguageCode(lang),
			})
			if err != nil {
				h.logger.ErrorContext(ctx, "auth_create_prefs_failed",
					slog.String("component", "auth"),
					slog.String("user_id", user.ID),
					slog.Any("err", err),
				)
				prefs = db.UserPreference{
					UserID:   user.ID,
					Language: db.LanguageCode(lang),
				}
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

	// Construct response combining WorkOS data (from JWT) and Local Preferences
	resp := map[string]interface{}{
		"id":          user.ID,
		"first_name":  user.FirstName,
		"last_name":   user.LastName,
		"email":       user.Email,
		"language":    prefs.Language,
		"avatar":      prefs.Avatar,
		"role":        user.Role,
		"permissions": user.Permissions,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}

type UpdateUserRequest struct {
	FirstName string `json:"first_name"`
	LastName  string `json:"last_name"`
	Language  string `json:"language"`
	Avatar    string `json:"avatar"`
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

	// Update Preferences (Language)
	prefs, err := h.q.UpsertUserPreferences(ctx, db.UpsertUserPreferencesParams{
		UserID:   user.ID,
		Language: db.LanguageCode(req.Language),
	})
	if err != nil {
		h.logger.ErrorContext(ctx, "auth_update_prefs_failed",
			slog.String("component", "auth"),
			slog.String("user_id", user.ID),
			slog.Any("err", err),
		)
		http.Error(w, "Failed to update settings", http.StatusInternalServerError)
		return
	}

	// Update avatar if provided
	if req.Avatar != "" {
		updated, err := h.q.UpdateUserAvatar(ctx, db.UpdateUserAvatarParams{
			UserID: user.ID,
			Avatar: req.Avatar,
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
		_, err := usermanagement.UpdateUser(context.Background(), usermanagement.UpdateUserOpts{
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

	// Refresh the session cookie so that a page reload reflects the new name immediately.
	// The JWT stores first_name/last_name and is the source of truth for GET /auth/me.
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"sub":         user.ID,
		"email":       user.Email,
		"first_name":  req.FirstName,
		"last_name":   req.LastName,
		"sid":         user.SID,
		"role":        user.Role,
		"permissions": user.Permissions,
		"exp":         time.Now().Add(24 * time.Hour).Unix(),
	})
	secret := []byte(os.Getenv("WORKOS_COOKIE_SECRET"))
	if len(secret) > 0 {
		if tokenString, err := token.SignedString(secret); err == nil {
			http.SetCookie(w, &http.Cookie{
				Name:     CookieName,
				Value:    tokenString,
				Path:     "/",
				Expires:  time.Now().Add(24 * time.Hour),
				HttpOnly: true,
				Secure:   true,
				SameSite: http.SameSiteLaxMode,
			})
		}
	}

	resp := map[string]interface{}{
		"id":          user.ID,
		"first_name":  req.FirstName,
		"last_name":   req.LastName,
		"email":       user.Email,
		"language":    prefs.Language,
		"avatar":      prefs.Avatar,
		"role":        user.Role,
		"permissions": user.Permissions,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}

// DevToken issues a Zeta JWT for a given email/password via WorkOS Password Auth.
// This endpoint is only available when DEV_AUTH_ENABLED=true and must never be
// enabled in production.
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
	resp, err := usermanagement.AuthenticateWithPassword(ctx, usermanagement.AuthenticateWithPasswordOpts{
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

	// Extract SID from WorkOS access token
	var woClaims jwt.MapClaims
	jwt.NewParser().ParseUnverified(resp.AccessToken, &woClaims)
	sid, _ := woClaims["sid"].(string)

	// Fetch role and permissions from WorkOS
	role := ""
	var userPermissions []string
	memberships, err := usermanagement.ListOrganizationMemberships(ctx, usermanagement.ListOrganizationMembershipsOpts{
		UserID: resp.User.ID,
	})
	if err == nil && len(memberships.Data) > 0 {
		role = memberships.Data[0].Role.Slug
		userPermissions, _ = h.getPermissionsForRole(ctx, role)
	}
	if userPermissions == nil {
		userPermissions = []string{}
	}

	// Build Zeta JWT (identical to /auth/callback)
	secret := []byte(os.Getenv("WORKOS_COOKIE_SECRET"))
	if len(secret) == 0 {
		http.Error(w, "WORKOS_COOKIE_SECRET is not set", http.StatusInternalServerError)
		return
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"sub":         resp.User.ID,
		"email":       resp.User.Email,
		"first_name":  resp.User.FirstName,
		"last_name":   resp.User.LastName,
		"sid":         sid,
		"role":        role,
		"permissions": userPermissions,
		"exp":         time.Now().Add(24 * time.Hour).Unix(),
	})

	tokenString, err := token.SignedString(secret)
	if err != nil {
		http.Error(w, "Failed to sign token", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"token": tokenString})
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
