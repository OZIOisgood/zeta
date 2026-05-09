package i18n

import (
	"embed"
	"encoding/json"
	"os"
	"sync"

	goi18n "github.com/nicksnyder/go-i18n/v2/i18n"
	"golang.org/x/text/language"
)

//go:embed locales/*.json
var localeFiles embed.FS

var (
	once   sync.Once
	bundle *goi18n.Bundle
)

func initBundle() {
	bundle = goi18n.NewBundle(language.English)
	bundle.RegisterUnmarshalFunc("json", json.Unmarshal)

	entries, err := localeFiles.ReadDir("locales")
	if err != nil {
		panic("i18n: failed to read locales directory: " + err.Error())
	}
	for _, entry := range entries {
		if entry.IsDir() {
			continue
		}
		data, err := localeFiles.ReadFile("locales/" + entry.Name())
		if err != nil {
			panic("i18n: failed to read locale file " + entry.Name() + ": " + err.Error())
		}
		if _, err := bundle.ParseMessageFileBytes(data, entry.Name()); err != nil {
			panic("i18n: failed to parse locale file " + entry.Name() + ": " + err.Error())
		}
	}
}

func getBundle() *goi18n.Bundle {
	once.Do(initBundle)
	return bundle
}

// For returns a localizer for the given language tag string (e.g. "en", "de", "fr").
// Falls back to the default language if the tag is unsupported.
func For(lang string) *goi18n.Localizer {
	return goi18n.NewLocalizer(getBundle(), lang, DefaultLang())
}

// Default returns a localizer using the DEFAULT_LANGUAGE env var or "en".
func Default() *goi18n.Localizer {
	return For(DefaultLang())
}

// DefaultLang returns the value of DEFAULT_LANGUAGE env var, or "en".
func DefaultLang() string {
	if v := os.Getenv("DEFAULT_LANGUAGE"); v != "" {
		return v
	}
	return "en"
}

// T translates messageID using loc and optional template data.
// On any error the message ID is returned verbatim so email rendering is never blocked.
func T(loc *goi18n.Localizer, messageID string, data ...map[string]any) string {
	cfg := &goi18n.LocalizeConfig{MessageID: messageID}
	if len(data) > 0 && data[0] != nil {
		cfg.TemplateData = data[0]
	}
	s, err := loc.Localize(cfg)
	if err != nil || s == "" {
		return messageID
	}
	return s
}
