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
	Note       string
	Button     string // CTA button label; used when Action != nil
	FooterNote string
}

// Action is the call-to-action button data.
type Action struct {
	URL string
}

// Message carries translated copy and an optional CTA action.
type Message struct {
	Copy   Copy
	Action *Action
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
	Action    *Action
}

func RenderTemplate(templateName TemplateName, message Message) (RenderedEmail, error) {
	styles, err := templateFiles.ReadFile("templates/styles.css")
	if err != nil {
		return RenderedEmail{}, fmt.Errorf("read email styles: %w", err)
	}

	name := string(templateName)
	tmpl, err := template.New("email").Funcs(template.FuncMap{
		"richText": formatRichText,
	}).ParseFS(templateFiles, "templates/layout.html", "templates/"+name+".html")
	if err != nil {
		return RenderedEmail{}, fmt.Errorf("parse email template: %w", err)
	}

	envelope := templateEnvelope{
		BrandName: "Strido",
		LogoURL:   logoURL(),
		Year:      time.Now().Year(),
		Styles:    template.CSS(string(styles)),
		Copy:      message.Copy,
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
	if v := strings.TrimSpace(os.Getenv("FRONTEND_URL")); v != "" {
		return strings.TrimRight(v, "/") + "/assets/brand/strido/strido-logo-320.png"
	}
	return "https://app.dev.strido.net/assets/brand/strido/strido-logo-320.png"
}

func formatRichText(value string) template.HTML {
	escaped := template.HTMLEscapeString(value)
	if strings.Count(escaped, "**")%2 != 0 {
		return template.HTML(escaped)
	}

	parts := strings.Split(escaped, "**")
	var result strings.Builder
	for index, part := range parts {
		if index%2 == 1 {
			result.WriteString("<strong>")
			result.WriteString(part)
			result.WriteString("</strong>")
			continue
		}
		result.WriteString(part)
	}
	return template.HTML(result.String())
}
