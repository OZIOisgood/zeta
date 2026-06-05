package preferences

import (
	"errors"
	"strings"

	"github.com/OZIOisgood/zeta/internal/db"
)

var ErrDisplayNameMissing = errors.New("user display name is missing")

func DisplayName(prefs db.UserPreference) string {
	return strings.TrimSpace(prefs.FirstName + " " + prefs.LastName)
}

func RequireDisplayName(prefs db.UserPreference) (string, error) {
	name := DisplayName(prefs)
	if name == "" {
		return "", ErrDisplayNameMissing
	}
	return name, nil
}
