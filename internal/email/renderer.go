package email

import (
	"bytes"
	"embed"
	"fmt"
	"html/template"
	"os"
	"strings"
	"time"

	"github.com/vanng822/go-premailer/premailer"
)

//go:embed templates/*.html templates/*.css
var templateFiles embed.FS

type TemplateName string

const TemplateNotification TemplateName = "notification"

// Copy holds all translated text for an outgoing email.
// Fields are fully-rendered strings (template variables already substituted).
type Copy struct {
	Preheader  string
	Title      string
	Intro      string
	Button     string // CTA button label; used when Action != nil
	FooterNote string
}

// Action is the call-to-action button data.
type Action struct {
	URL string
}

type Detail struct {
	Label string
	Value string
}

// Message carries Copy, structured key/value details, and an optional CTA action.
type Message struct {
	Copy    Copy
	Details []Detail
	Action  *Action
}

type RenderedEmail struct {
	HTML string
	Text string
}

type templateEnvelope struct {
	BrandName string
	LogoURL   string
	Year      int
	Styles    template.CSS
	Copy      Copy
	Details   []Detail
	Action    *Action
}

func RenderTemplate(templateName TemplateName, message Message) (RenderedEmail, error) {
	styles, err := templateFiles.ReadFile("templates/styles.css")
	if err != nil {
		return RenderedEmail{}, fmt.Errorf("read email styles: %w", err)
	}

	name := string(templateName)
	tmpl, err := template.ParseFS(templateFiles, "templates/layout.html", "templates/"+name+".html")
	if err != nil {
		return RenderedEmail{}, fmt.Errorf("parse email template: %w", err)
	}

	envelope := templateEnvelope{
		BrandName: "Zeta",
		LogoURL:   logoURL(),
		Year:      time.Now().Year(),
		Styles:    template.CSS(string(styles)),
		Copy:      message.Copy,
		Details:   message.Details,
		Action:    message.Action,
	}

	var rawHTML bytes.Buffer
	if err := tmpl.ExecuteTemplate(&rawHTML, name, envelope); err != nil {
		return RenderedEmail{}, fmt.Errorf("execute email template: %w", err)
	}

	pm, err := premailer.NewPremailerFromString(rawHTML.String(), premailer.NewOptions(
		premailer.WithCssToAttributes(true),
		premailer.WithRemoveClasses(false),
	))
	if err != nil {
		return RenderedEmail{}, fmt.Errorf("prepare css inliner: %w", err)
	}

	html, err := pm.Transform()
	if err != nil {
		return RenderedEmail{}, fmt.Errorf("inline email css: %w", err)
	}

	text, err := pm.TransformText(premailer.WithTextOnly(true))
	if err != nil {
		return RenderedEmail{}, fmt.Errorf("render email text fallback: %w", err)
	}

	return RenderedEmail{HTML: html, Text: text}, nil
}

func logoURL() string {
	if v := strings.TrimSpace(os.Getenv("EMAIL_LOGO_URL")); v != "" {
		return v
	}
	if v := strings.TrimSpace(os.Getenv("FRONTEND_URL")); v != "" {
		return strings.TrimRight(v, "/") + "/app-full-icon.png"
	}
	return "https://dev.zeta.m4xon.com/app-full-icon.png"
}
