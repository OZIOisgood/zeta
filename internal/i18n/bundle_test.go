package i18n

import (
	"testing"
)

func TestTFallsBackToMessageID(t *testing.T) {
	loc := For("en")
	got := T(loc, "no.such.key")
	if got != "no.such.key" {
		t.Fatalf("expected message ID as fallback, got %q", got)
	}
}

func TestTTranslatesEnglish(t *testing.T) {
	loc := For("en")
	got := T(loc, "email.detail.session")
	if got != "Session" {
		t.Fatalf("expected \"Session\", got %q", got)
	}
}

func TestTTranslatesGerman(t *testing.T) {
	loc := For("de")
	got := T(loc, "email.detail.session")
	if got != "Sitzung" {
		t.Fatalf("expected \"Sitzung\", got %q", got)
	}
}

func TestTTranslatesFrench(t *testing.T) {
	loc := For("fr")
	got := T(loc, "email.detail.group")
	if got != "Groupe" {
		t.Fatalf("expected \"Groupe\", got %q", got)
	}
}

func TestTWithTemplateData(t *testing.T) {
	loc := For("en")
	got := T(loc, "email.invitation.preheader", map[string]any{"InviterName": "Alex"})
	want := "Alex invited you to join a group on Zeta."
	if got != want {
		t.Fatalf("expected %q, got %q", want, got)
	}
}

func TestDefaultLangFallback(t *testing.T) {
	t.Setenv("DEFAULT_LANGUAGE", "")
	if DefaultLang() != "en" {
		t.Fatal("expected en as default")
	}
}
