package auth

import (
	"context"
	"fmt"
	"net/http"
	"os"

	"github.com/golang-jwt/jwt/v5"
)

type contextKey string

const UserKey contextKey = "user"

type UserContext struct {
	ID                string `json:"id"`
	Email             string `json:"email"`
	Name              string `json:"name"`
	ProfilePictureUrl string `json:"profilePictureUrl"`
}

func Middleware() func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			cookie, err := r.Cookie(CookieName)
			if err != nil {
				next.ServeHTTP(w, r)
				return
			}

			tokenString := cookie.Value
			secret := []byte(os.Getenv("WORKOS_COOKIE_SECRET"))

			token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
				if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
					return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
				}
				return secret, nil
			})

			if err != nil || !token.Valid {
				// Invalid token, just continue as unauthenticated
				next.ServeHTTP(w, r)
				return
			}

			if claims, ok := token.Claims.(jwt.MapClaims); ok {
				userID, _ := claims["sub"].(string)
				email, _ := claims["email"].(string)
				name, _ := claims["name"].(string)
				profilePictureUrl, _ := claims["picture"].(string)

				user := &UserContext{
					ID:                userID,
					Email:             email,
					Name:              name,
					ProfilePictureUrl: profilePictureUrl,
				}
				ctx := context.WithValue(r.Context(), UserKey, user)
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
