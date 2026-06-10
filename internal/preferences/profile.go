package preferences

import (
	"errors"
	"fmt"
	"hash/fnv"
	"regexp"
	"strings"
	"unicode"

	"github.com/OZIOisgood/zeta/internal/db"
)

var ErrDisplayNameMissing = errors.New("user display name is missing")
var ErrUsernameInvalid = errors.New("username must be 3-30 lowercase letters, numbers, dots, underscores, or hyphens")

var usernamePattern = regexp.MustCompile(`^[a-z0-9][a-z0-9._-]{1,28}[a-z0-9]$`)

func DisplayName(prefs db.UserPreference) string {
	return strings.TrimSpace(prefs.Username)
}

func RequireDisplayName(prefs db.UserPreference) (string, error) {
	name := DisplayName(prefs)
	if name == "" {
		return "", ErrDisplayNameMissing
	}
	return name, nil
}

func NormalizeUsername(username string) string {
	return strings.ToLower(strings.TrimSpace(username))
}

func ValidateUsername(username string) error {
	if username != NormalizeUsername(username) {
		return ErrUsernameInvalid
	}
	if strings.Contains(username, "@") || !usernamePattern.MatchString(username) {
		return ErrUsernameInvalid
	}
	return nil
}

func DefaultUsernameCandidate(firstName, lastName, userID string) string {
	first := usernamePart(firstName)
	lastInitial := usernameInitial(lastName)

	var candidate string
	switch {
	case first != "" && lastInitial != "":
		candidate = first + "." + lastInitial
	case first != "":
		candidate = first
	default:
		candidate = "user-" + shortHash(userID)
	}

	candidate = NormalizeUsername(candidate)
	if ValidateUsername(candidate) == nil {
		return candidate
	}
	return "user-" + shortHash(userID)
}

func UsernameWithSuffix(base string, suffix int) string {
	if suffix <= 1 {
		return base
	}
	postfix := fmt.Sprintf("-%d", suffix)
	limit := 30 - len(postfix)
	if limit < 3 {
		limit = 3
	}
	return strings.TrimRight(base[:min(len(base), limit)], ".-_") + postfix
}

func usernamePart(value string) string {
	var builder strings.Builder
	for _, r := range strings.ToLower(strings.TrimSpace(value)) {
		switch {
		case r >= 'a' && r <= 'z':
			builder.WriteRune(r)
		case r >= '0' && r <= '9':
			builder.WriteRune(r)
		case r == '.' || r == '_' || r == '-':
			builder.WriteRune(r)
		case unicode.IsSpace(r):
			builder.WriteRune('-')
		}
	}
	return strings.Trim(builder.String(), ".-_")
}

func usernameInitial(value string) string {
	part := usernamePart(value)
	if part == "" {
		return ""
	}
	return part[:1]
}

func shortHash(value string) string {
	h := fnv.New32a()
	_, _ = h.Write([]byte(value))
	return fmt.Sprintf("%08x", h.Sum32())
}
