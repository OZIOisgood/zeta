package tools

import (
	"os"
	"strings"
)

// NegotiateLanguage selects the best match language from the Accept-Language header
// based on the SUPPORTED_LANGUAGES environment variable.
// Defaults to "en" if no match is found or if SUPPORTED_LANGUAGES is not set.
func NegotiateLanguage(acceptLanguageHeader string) string {
	supportedEnv := os.Getenv("SUPPORTED_LANGUAGES")
	if supportedEnv == "" {
		supportedEnv = "en"
	}

	supportedList := strings.Split(supportedEnv, ",")
	supportedMap := make(map[string]bool)
	var firstSupported string

	for _, lang := range supportedList {
		// Clean up the language string: trim spaces and quotes
		cleanLang := strings.TrimSpace(lang)
		cleanLang = strings.Trim(cleanLang, `"'`)
		cleanLang = strings.ToLower(cleanLang)

		if cleanLang == "" {
			continue
		}

		if firstSupported == "" {
			firstSupported = cleanLang
		}
		supportedMap[cleanLang] = true
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

	// Fallback to first supported language or "en"
	if firstSupported != "" {
		return firstSupported
	}
	return "en"
}
