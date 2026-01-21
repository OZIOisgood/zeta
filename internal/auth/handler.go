package auth

import (
	"context"
	"encoding/json"
	"net/http"
	"os"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/workos/workos-go/v4/pkg/usermanagement"
)

const CookieName = "zeta_session"

type Handler struct {
}

func NewHandler() *Handler {
	usermanagement.SetAPIKey(os.Getenv("WORKOS_API_KEY"))
	return &Handler{}
}

func (h *Handler) Login(w http.ResponseWriter, r *http.Request) {
	clientID := os.Getenv("WORKOS_CLIENT_ID")
	redirectURI := os.Getenv("WORKOS_REDIRECT_URI")

	url, err := usermanagement.GetAuthorizationURL(usermanagement.GetAuthorizationURLOpts{
		ClientID:    clientID,
		RedirectURI: redirectURI,
		Provider:    "authkit",
	})
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	http.Redirect(w, r, url.String(), http.StatusSeeOther)
}

func (h *Handler) Callback(w http.ResponseWriter, r *http.Request) {
	code := r.URL.Query().Get("code")
	if code == "" {
		http.Error(w, "No code provided", http.StatusBadRequest)
		return
	}

	clientID := os.Getenv("WORKOS_CLIENT_ID")

	resp, err := usermanagement.AuthenticateWithCode(context.Background(), usermanagement.AuthenticateWithCodeOpts{
		ClientID: clientID,
		Code:     code,
	})
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Extract Session ID from WorkOS Access Token
	var claims jwt.MapClaims
	_, _, err = jwt.NewParser().ParseUnverified(resp.AccessToken, &claims)
	if err != nil {
		http.Error(w, "Failed to parse access token: "+err.Error(), http.StatusInternalServerError)
		return
	}

	sid, _ := claims["sid"].(string)

	// Create JWT
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"sub":   resp.User.ID,
		"email": resp.User.Email,
		"sid":   sid,
		"exp":   time.Now().Add(24 * time.Hour).Unix(),
	})

	secret := []byte(os.Getenv("WORKOS_COOKIE_SECRET"))
	if len(secret) == 0 {
		http.Error(w, "WORKOS_COOKIE_SECRET is not set", http.StatusInternalServerError)
		return
	}

	tokenString, err := token.SignedString(secret)
	if err != nil {
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
		SameSite: http.SameSiteLaxMode,
	})

	http.Redirect(w, r, "http://localhost:4200", http.StatusSeeOther)
}

func (h *Handler) Logout(w http.ResponseWriter, r *http.Request) {
	// 1. Clear local cookie
	cookie, err := r.Cookie(CookieName)
	http.SetCookie(w, &http.Cookie{
		Name:     CookieName,
		Value:    "",
		Path:     "/",
		Expires:  time.Now().Add(-1 * time.Hour),
		HttpOnly: true,
		Secure:   true,
	})

	// 2. Determine redirect URL
	redirectTarget := "http://localhost:4200" // Default fallback

	if err == nil && cookie.Value != "" {
		tokenString := cookie.Value
		secret := []byte(os.Getenv("WORKOS_COOKIE_SECRET"))

		token, _ := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
			return secret, nil
		})

		if token != nil {
			if claims, ok := token.Claims.(jwt.MapClaims); ok {
				if sid, ok := claims["sid"].(string); ok && sid != "" {
					logoutURL, err := usermanagement.GetLogoutURL(usermanagement.GetLogoutURLOpts{
						SessionID: sid,
						// Use default return_to or specify one if needed
						// ReturnTo: "http://localhost:4200",
					})
					if err == nil {
						redirectTarget = logoutURL.String()
					}
				}
			}
		}
	}

	// 3. Return the logout URL as JSON instead of redirecting
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"logoutUrl": redirectTarget,
	})
}

func (h *Handler) Me(w http.ResponseWriter, r *http.Request) {
	user := GetUser(r.Context())
	if user == nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	json.NewEncoder(w).Encode(user)
}
