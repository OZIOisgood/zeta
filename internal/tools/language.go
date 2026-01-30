package tools

import (
	"os"
	"strings"
)

// NegotiateLanguage selects the best match language from the Accept-Language header
// based on the supported languages defined in the database enum (en, de, fr).
// Defaults to DEFAULT_LANGUAGE env var or "en" if no match is found.
func NegotiateLanguage(acceptLanguageHeader string) string {
	// Supported languages match the database LanguageCode enum
	supportedLanguages := []string{"en", "de", "fr"}
	supportedMap := make(map[string]bool)
	
	for _, lang := range supportedLanguages {
		supportedMap[lang] = true
	}
	
	defaultLang := os.Getenv("DEFAULT_LANGUAGE")
	if defaultLang == "" {
		defaultLang = "en"
	}

	// Accept-Language format: en-US,en;q=0.9,ru;q=0.8
	// We will naïvely assume that the order represents preference (which is often true for headers sent by browsers)
	// or that simply checking them in order is "good enough" without complex q-value sorting.
	// A proper implementation would parse q-values and sort.
	
	tags := strings.Split(acceptLanguageHeader, ",")
	for _, tag := range tags {
		// remove q-value and trim
		parts := strings.Split(strings.TrimSpace(tag), ";")
		lang := strings.TrimSpace(parts[0]) // e.g. "en-US" or "en"
		lang = strings.ToLower(lang)

		if lang == "" {
			continue
		}

		// Check exact match
		if supportedMap[lang] {
			return lang
		}

		// Check base language match (e.g. "en-US" -> "en")
		if idx := strings.Index(lang, "-"); idx != -1 {
			baseLang := lang[:idx]
			if supportedMap[baseLang] {
				return baseLang
			}
		}
	}

	// Fallback to default language
	return defaultLang
}
