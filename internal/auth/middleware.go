package auth

import (
	"context"
	"fmt"
	"log/slog"
	"net/http"

	"github.com/golang-jwt/jwt/v5"
)

type contextKey string

const UserKey contextKey = "user"

type UserContext struct {
	ID                string   `json:"id"`
	Email             string   `json:"email"`
	FirstName         string   `json:"firstName"`
	LastName          string   `json:"lastName"`
	ProfilePictureUrl string   `json:"profilePictureUrl"`
	Role              string   `json:"role"`
	SID               string   `json:"sid"`
	Permissions       []string `json:"permissions"`
}

func Middleware(logger *slog.Logger, jwks *JWKSCache) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			var tokenString string

			// Prefer Authorization: Bearer header (mobile clients), fall back to cookie (web)
			if authHeader := r.Header.Get("Authorization"); len(authHeader) > 7 && authHeader[:7] == "Bearer " {
				tokenString = authHeader[7:]
			} else if cookie, err := r.Cookie(CookieName); err == nil {
				tokenString = cookie.Value
			} else {
				next.ServeHTTP(w, r)
				return
			}

			token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
				if _, ok := token.Method.(*jwt.SigningMethodRSA); !ok {
					return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
				}
				kid, _ := token.Header["kid"].(string)
				return jwks.GetKey(kid)
			})

			if err != nil || !token.Valid {
				logger.DebugContext(r.Context(), "auth_token_invalid",
					slog.String("component", "auth"),
					slog.Any("err", err),
				)
				next.ServeHTTP(w, r)
				return
			}

			if claims, ok := token.Claims.(jwt.MapClaims); ok {
				userID, _ := claims["sub"].(string)
				email, _ := claims["email"].(string)
				firstName, _ := claims["first_name"].(string)
				lastName, _ := claims["last_name"].(string)
				profilePictureUrl, _ := claims["picture"].(string)
				role, _ := claims["role"].(string)
				sid, _ := claims["sid"].(string)

				// Parse permissions from JWT claims
				var userPermissions []string
				if permsRaw, ok := claims["permissions"]; ok {
					if permsSlice, ok := permsRaw.([]interface{}); ok {
						for _, p := range permsSlice {
							if s, ok := p.(string); ok {
								userPermissions = append(userPermissions, s)
							}
						}
					}
				}

				user := &UserContext{
					ID:                userID,
					Email:             email,
					FirstName:         firstName,
					LastName:          lastName,
					ProfilePictureUrl: profilePictureUrl,
					Role:              role,
					SID:               sid,
					Permissions:       userPermissions,
				}
				ctx := context.WithValue(r.Context(), UserKey, user)
				logger.DebugContext(ctx, "user_authenticated",
					slog.String("component", "auth"),
					slog.String("user_id", userID),
				)
				next.ServeHTTP(w, r.WithContext(ctx))
			} else {
				next.ServeHTTP(w, r)
			}
		})
	}
}

func RequireAuth(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		user := GetUser(r.Context())
		if user == nil {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func GetUser(ctx context.Context) *UserContext {
	user, ok := ctx.Value(UserKey).(*UserContext)
	if !ok {
		return nil
	}
	return user
}
