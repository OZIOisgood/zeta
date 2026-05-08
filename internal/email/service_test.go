package email

import (
	"log/slog"
	"strings"
	"testing"
)

func TestNewServiceReadsConfiguredSender(t *testing.T) {
	t.Setenv("RESEND_API_KEY", "re_test")
	t.Setenv("RESEND_FROM_EMAIL", "notifications@dev.zeta.m4xon.com")

	service := NewService(slog.Default())

	if service.from != "notifications@dev.zeta.m4xon.com" {
		t.Fatalf("expected sender %q, got %q", "notifications@dev.zeta.m4xon.com", service.from)
	}
}

func TestRenderNotificationTemplateInlinesCSS(t *testing.T) {
	rendered, err := RenderTemplate(TemplateNotification, Message{
		Preheader: "Your video has been reviewed.",
		Heading:   "Your video has been reviewed",
		Intro:     "Your video has been reviewed and is now finalized.",
		Details: []Detail{
			{Label: "Video", Value: "Backhand drill"},
		},
		Action: &Action{Label: "Open Zeta", URL: "http://localhost:4200"},
	})
	if err != nil {
		t.Fatalf("render template: %v", err)
	}

	for _, want := range []string{
		"https://dev.zeta.m4xon.com/app-full-icon.png",
		"Your video has been reviewed",
		"Backhand drill",
		"style=",
		"#526ed3",
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

func TestRenderTemplateUsesConfiguredLogoURL(t *testing.T) {
	t.Setenv("EMAIL_LOGO_URL", "https://example.com/logo.png")

	rendered, err := RenderTemplate(TemplateNotification, Message{
		Heading: "Configured logo",
		Intro:   "Logo URL should be configurable.",
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
