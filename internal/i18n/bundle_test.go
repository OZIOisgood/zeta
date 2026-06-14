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
	got := T(loc, "email.member_removed.intro", map[string]any{"GroupName": "Dressage Team"})
	if got != "You have been removed from the **“Dressage Team”** group." {
		t.Fatalf("unexpected English email copy: %q", got)
	}
}

func TestTTranslatesGerman(t *testing.T) {
	loc := For("de")
	got := T(loc, "email.member_removed.intro", map[string]any{"GroupName": "Dressurteam"})
	if got != "Du wurdest aus der Gruppe **„Dressurteam“** entfernt." {
		t.Fatalf("unexpected German email copy: %q", got)
	}
}

func TestTTranslatesFrench(t *testing.T) {
	loc := For("fr")
	got := T(loc, "email.member_removed.intro", map[string]any{"GroupName": "Équipe"})
	if got != "Vous avez été retiré du groupe **« Équipe »**." {
		t.Fatalf("unexpected French email copy: %q", got)
	}
}

func TestTWithTemplateData(t *testing.T) {
	loc := For("en")
	got := T(loc, "email.invitation.preheader", map[string]any{"InviterName": "Alex"})
	want := "Alex invited you to join a group on Strido."
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
