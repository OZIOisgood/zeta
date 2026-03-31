package auth

import (
	"context"
	"encoding/json"
	"fmt"
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

	// Fetch Role from WorkOS
	role := ""
	memberships, err := usermanagement.ListOrganizationMemberships(ctx, usermanagement.ListOrganizationMembershipsOpts{
		UserID: resp.User.ID,
	})
	if err == nil && len(memberships.Data) > 0 {
		role = memberships.Data[0].Role.Slug
	} else if err != nil {
		h.logger.WarnContext(ctx, "auth_fetch_role_failed",
			slog.String("user_id", resp.User.ID),
			slog.Any("err", err),
		)
	}

	// Create JWT
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"sub":        resp.User.ID,
		"email":      resp.User.Email,
		"first_name": resp.User.FirstName,
		"last_name":  resp.User.LastName,
		"picture":    resp.User.ProfilePictureURL,
		"sid":        sid,
		"role":       role,
		"exp":        time.Now().Add(24 * time.Hour).Unix(),
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

func (h *Handler) ensureUserInOrg(ctx context.Context, userID string) (string, error) {
	// 1. Check existing memberships
	memberships, err := usermanagement.ListOrganizationMemberships(ctx, usermanagement.ListOrganizationMembershipsOpts{
		UserID: userID,
	})
	if err != nil {
		return "", err
	}

	if len(memberships.Data) > 0 {
		return memberships.Data[0].Role.Slug, nil
	}

	// 2. Add to Default Org
	defaultOrgID := os.Getenv("DEFAULT_ORG_ID")
	if defaultOrgID == "" {
		defaultOrgID = "org_01KFQFSEEVTCBYCV85D12DZ35M"
	}

	// Use permission constant implicitly or role constant
	role := permissions.RoleStudent

	_, err = usermanagement.CreateOrganizationMembership(ctx, usermanagement.CreateOrganizationMembershipOpts{
		OrganizationID: defaultOrgID,
		UserID:         userID,
		RoleSlug:       role,
	})
	if err != nil {
		return "", fmt.Errorf("failed to add user to org: %w", err)
	}

	return role, nil
}

func (h *Handler) Me(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	user := GetUser(ctx)
	if user == nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// Ensure User is in Organization (and get Role)
	// We check if Role is missing in context, or if we want to enforce it.
	// Since user might have been added out of band, or we just want to be sure.
	currentRole := user.Role

	// Only call ensureUserInOrg when the JWT has no role yet (first login or role not persisted).
	// Calling it on every /auth/me request would incur a WorkOS API call each time.
	if currentRole == "" {
		newRole, err := h.ensureUserInOrg(ctx, user.ID)
		if err != nil {
			h.logger.ErrorContext(ctx, "auth_ensure_org_failed",
				slog.String("user_id", user.ID),
				slog.Any("err", err),
			)
		} else if newRole != currentRole {
			// Role changed. Update Cookie with new role and re-use existing SID.

			// Create new JWT
			token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
				"sub":        user.ID,
				"email":      user.Email,
				"first_name": user.FirstName,
				"last_name":  user.LastName,
				"picture":    user.ProfilePictureUrl,
				"sid":        user.SID,
				"role":       newRole,
				"exp":        time.Now().Add(24 * time.Hour).Unix(),
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
					h.logger.InfoContext(ctx, "auth_role_updated_in_cookie",
						slog.String("component", "auth"),
						slog.String("user_id", user.ID),
						slog.String("new_role", newRole),
					)
				}
			}

			// Update the local user object for the response
			user.Role = newRole
		}
	}

	// Fetch user preferences (language) (REMAINING CODE)
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
				// Continue with default language if DB write fails?
				// Better to error out or return default structure without saving
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
		"id":                  user.ID,
		"first_name":          user.FirstName,
		"last_name":           user.LastName,
		"email":               user.Email,
		"language":            prefs.Language,
		"profile_picture_url": user.ProfilePictureUrl,
		"role":                user.Role,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}

type UpdateUserRequest struct {
	FirstName string `json:"first_name"`
	LastName  string `json:"last_name"`
	Language  string `json:"language"`
}

// MobileLogin redirects to WorkOS login with a mobile deep-link redirect URI.
func (h *Handler) MobileLogin(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	h.logger.InfoContext(ctx, "auth_mobile_login_initiated",
		slog.String("component", "auth"),
	)

	clientID := os.Getenv("WORKOS_CLIENT_ID")
	mobileRedirectURI := os.Getenv("WORKOS_MOBILE_REDIRECT_URI")
	if mobileRedirectURI == "" {
		mobileRedirectURI = "zeta://auth/callback"
	}

	url, err := usermanagement.GetAuthorizationURL(usermanagement.GetAuthorizationURLOpts{
		ClientID:    clientID,
		RedirectURI: mobileRedirectURI,
		Provider:    "authkit",
	})
	if err != nil {
		h.logger.ErrorContext(ctx, "auth_mobile_get_url_failed",
			slog.String("component", "auth"),
			slog.Any("err", err),
		)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	http.Redirect(w, r, url.String(), http.StatusSeeOther)
}

type MobileTokenRequest struct {
	Code string `json:"code"`
}

type MobileTokenResponse struct {
	Token string `json:"token"`
	User  struct {
		ID                string `json:"id"`
		Email             string `json:"email"`
		FirstName         string `json:"first_name"`
		LastName          string `json:"last_name"`
		ProfilePictureURL string `json:"profile_picture_url"`
		Role              string `json:"role"`
	} `json:"user"`
}

// MobileToken exchanges an OAuth code for a JWT returned in the response body (for mobile clients).
func (h *Handler) MobileToken(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	var req MobileTokenRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.Code == "" {
		http.Error(w, "Invalid request body: code is required", http.StatusBadRequest)
		return
	}

	clientID := os.Getenv("WORKOS_CLIENT_ID")

	resp, err := usermanagement.AuthenticateWithCode(ctx, usermanagement.AuthenticateWithCodeOpts{
		ClientID: clientID,
		Code:     req.Code,
	})
	if err != nil {
		h.logger.ErrorContext(ctx, "auth_mobile_token_authenticate_failed",
			slog.String("component", "auth"),
			slog.Any("err", err),
		)
		http.Error(w, "Authentication failed", http.StatusUnauthorized)
		return
	}

	// Extract Session ID from WorkOS Access Token
	var claims jwt.MapClaims
	_, _, _ = jwt.NewParser().ParseUnverified(resp.AccessToken, &claims)
	sid, _ := claims["sid"].(string)

	// Fetch Role
	role := ""
	memberships, err := usermanagement.ListOrganizationMemberships(ctx, usermanagement.ListOrganizationMembershipsOpts{
		UserID: resp.User.ID,
	})
	if err == nil && len(memberships.Data) > 0 {
		role = memberships.Data[0].Role.Slug
	}

	// Create JWT
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"sub":        resp.User.ID,
		"email":      resp.User.Email,
		"first_name": resp.User.FirstName,
		"last_name":  resp.User.LastName,
		"picture":    resp.User.ProfilePictureURL,
		"sid":        sid,
		"role":       role,
		"exp":        time.Now().Add(24 * time.Hour).Unix(),
	})

	secret := []byte(os.Getenv("WORKOS_COOKIE_SECRET"))
	if len(secret) == 0 {
		http.Error(w, "Server misconfiguration", http.StatusInternalServerError)
		return
	}

	tokenString, err := token.SignedString(secret)
	if err != nil {
		http.Error(w, "Failed to sign token", http.StatusInternalServerError)
		return
	}

	h.logger.InfoContext(ctx, "auth_mobile_token_issued",
		slog.String("component", "auth"),
		slog.String("user_id", resp.User.ID),
	)

	var tokenResp MobileTokenResponse
	tokenResp.Token = tokenString
	tokenResp.User.ID = resp.User.ID
	tokenResp.User.Email = resp.User.Email
	tokenResp.User.FirstName = resp.User.FirstName
	tokenResp.User.LastName = resp.User.LastName
	tokenResp.User.ProfilePictureURL = resp.User.ProfilePictureURL
	tokenResp.User.Role = role

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(tokenResp)
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

	resp := map[string]interface{}{
		"id":                  user.ID,
		"first_name":          req.FirstName,
		"last_name":           req.LastName,
		"email":               user.Email,
		"language":            prefs.Language,
		"profile_picture_url": user.ProfilePictureUrl,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}
