package email

import (
	"log/slog"
	"strings"
	"testing"
)

func TestNewServiceReadsConfiguredSender(t *testing.T) {
	t.Setenv("RESEND_API_KEY", "re_test")
	t.Setenv("RESEND_FROM_EMAIL", "notifications@strido.net")

	service := NewService(slog.Default())

	if service.from != "notifications@strido.net" {
		t.Fatalf("expected sender %q, got %q", "notifications@strido.net", service.from)
	}
}

func TestRenderNotificationTemplateInlinesCSS(t *testing.T) {
	t.Setenv("EMAIL_LOGO_URL", "")
	t.Setenv("FRONTEND_URL", "")

	rendered, err := RenderTemplate(TemplateNotification, Message{
		Copy: Copy{
			Preheader: "Your video has been reviewed.",
			Title:     "Your video has been reviewed",
			Intro:     "Your video has been reviewed and is now finalized.",
		},
		Details: []Detail{
			{Label: "Video", Value: "Backhand drill"},
		},
		Action: &Action{URL: "http://localhost:4200"},
	})
	if err != nil {
		t.Fatalf("render template: %v", err)
	}

	for _, want := range []string{
		"https://app.dev.strido.net/assets/brand/mark/zeta-horse-mark-orange-128.png",
		"Your video has been reviewed",
		"Backhand drill",
		"style=",
		"#ea580c",
		"text-align:center",
	} {
		if !strings.Contains(rendered.HTML, want) {
			t.Fatalf("expected rendered HTML to contain %q, got:\n%s", want, rendered.HTML)
		}
	}
	if !strings.Contains(rendered.Text, "Backhand drill") {
		t.Fatalf("expected text fallback to contain detail value, got:\n%s", rendered.Text)
	}
}

func TestRenderTemplateBuildsLogoURLFromFrontendURL(t *testing.T) {
	t.Setenv("EMAIL_LOGO_URL", "")
	t.Setenv("FRONTEND_URL", "https://app.strido.net/")

	rendered, err := RenderTemplate(TemplateNotification, Message{
		Copy: Copy{
			Title: "Frontend logo",
			Intro: "Logo URL should use the configured frontend.",
		},
	})
	if err != nil {
		t.Fatalf("render template: %v", err)
	}
	if !strings.Contains(rendered.HTML, "https://app.strido.net/assets/brand/mark/zeta-horse-mark-orange-128.png") {
		t.Fatalf("expected rendered HTML to derive the logo URL from FRONTEND_URL, got:\n%s", rendered.HTML)
	}
}

func TestRenderTemplateUsesConfiguredLogoURL(t *testing.T) {
	t.Setenv("EMAIL_LOGO_URL", "https://example.com/logo.png")

	rendered, err := RenderTemplate(TemplateNotification, Message{
		Copy: Copy{
			Title: "Configured logo",
			Intro: "Logo URL should be configurable.",
		},
	})
	if err != nil {
		t.Fatalf("render template: %v", err)
	}
	if !strings.Contains(rendered.HTML, "https://example.com/logo.png") {
		t.Fatalf("expected rendered HTML to use configured logo URL, got:\n%s", rendered.HTML)
	}
}

func TestRenderTemplateRejectsUnknownTemplate(t *testing.T) {
	_, err := RenderTemplate(TemplateName("missing"), Message{})
	if err == nil {
		t.Fatal("expected missing template to fail")
	}
}
