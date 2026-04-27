package tools

import (
	"testing"
)

// TestNegotiateLanguage covers NegotiateLanguage using table-driven tests.
// Note: DEFAULT_LANGUAGE env var is controlled per subtest via t.Setenv,
// which automatically restores the original value after each subtest.
func TestNegotiateLanguage(t *testing.T) {
	tests := []struct {
		name       string
		header     string
		defaultEnv string // empty means "not set" (function falls back to "en")
		want       string
	}{
		{name: "empty header returns default en", header: "", want: "en"},
		{name: "exact match en", header: "en", want: "en"},
		{name: "exact match de", header: "de", want: "de"},
		{name: "exact match fr", header: "fr", want: "fr"},
		{name: "base language en-US", header: "en-US", want: "en"},
		{name: "base language de-AT", header: "de-AT", want: "de"},
		{name: "base language fr-CH", header: "fr-CH", want: "fr"},
		{name: "header normalized to lowercase", header: "DE", want: "de"},
		{name: "unsupported language falls back to en", header: "ru", want: "en"},
		{name: "multiple tags first supported wins", header: "zh,de,fr", want: "de"},
		{name: "q-value header first tag match", header: "fr-CH,fr;q=0.9,en;q=0.8", want: "fr"},
		{name: "custom DEFAULT_LANGUAGE used as fallback", header: "ru", defaultEnv: "fr", want: "fr"},
		{name: "whitespace trimmed around tag", header: " de ", want: "de"},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			// t.Setenv restores the original value automatically after the subtest.
			t.Setenv("DEFAULT_LANGUAGE", tc.defaultEnv)
			got := NegotiateLanguage(tc.header)
			if got != tc.want {
				t.Errorf("NegotiateLanguage(%q) = %q, want %q", tc.header, got, tc.want)
			}
		})
	}
}

