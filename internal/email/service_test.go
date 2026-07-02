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
	t.Setenv("FRONTEND_URL", "")

	rendered, err := RenderTemplate(TemplateNotification, Message{
		Copy: Copy{
			Preheader: "Your video has been reviewed.",
			Title:     "Your video has been reviewed",
			Intro:     "Your video **“Backhand drill”** has been reviewed.",
		},
		Action: &Action{URL: "http://localhost:4200"},
	})
	if err != nil {
		t.Fatalf("render template: %v", err)
	}

	for _, want := range []string{
		"https://app.dev.strido.net/assets/brand/strido/strido-logo-320.png",
		"Your video has been reviewed",
		"Backhand drill",
		"style=",
		"#ea580c",
		"text-align:left",
	} {
		if !strings.Contains(rendered.HTML, want) {
			t.Fatalf("expected rendered HTML to contain %q, got:\n%s", want, rendered.HTML)
		}
	}
	if !strings.Contains(rendered.HTML, "<strong") {
		t.Fatalf("expected rich intro emphasis, got:\n%s", rendered.HTML)
	}
	if !strings.Contains(rendered.Text, "Backhand drill") {
		t.Fatalf("expected text fallback to contain intro value, got:\n%s", rendered.Text)
	}
}

func TestRenderTemplateBuildsLogoURLFromFrontendURL(t *testing.T) {
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
	if !strings.Contains(rendered.HTML, "https://app.strido.net/assets/brand/strido/strido-logo-320.png") {
		t.Fatalf("expected rendered HTML to derive the logo URL from FRONTEND_URL, got:\n%s", rendered.HTML)
	}
}

func TestFormatRichTextEscapesUserContent(t *testing.T) {
	got := string(formatRichText("Hello **<script>alert(1)</script>**"))
	if strings.Contains(got, "<script>") || !strings.Contains(got, "<strong>&lt;script&gt;") {
		t.Fatalf("expected escaped emphasized content, got %q", got)
	}
}

func TestRenderTemplateRejectsUnknownTemplate(t *testing.T) {
	_, err := RenderTemplate(TemplateName("missing"), Message{})
	if err == nil {
		t.Fatal("expected missing template to fail")
	}
}
