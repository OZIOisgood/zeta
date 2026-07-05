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

func PublicDisplayName(prefs db.UserPreference) string {
	if displayName := strings.TrimSpace(prefs.DisplayName); displayName != "" {
		return displayName
	}
	return DefaultDisplayName(prefs.FirstName, prefs.LastName)
}

func DefaultDisplayName(first, last string) string {
	firstName := strings.TrimSpace(first)
	lastName := strings.TrimSpace(last)
	lastInitial := firstRuneUpper(lastName)

	if firstName != "" && lastName != "" {
		return firstName + " " + lastInitial + "."
	}
	if firstName != "" {
		return firstName
	}
	if lastName != "" {
		return lastInitial + "."
	}
	return "User"
}

func firstRuneUpper(value string) string {
	for _, r := range value {
		return strings.ToUpper(string(r))
	}
	return ""
}

func RequireDisplayName(prefs db.UserPreference) (string, error) {
	name := DisplayName(prefs)
	if name == "" {
		return "", ErrDisplayNameMissing
	}
	return name, nil
}
