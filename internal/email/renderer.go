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

type Action struct {
	Label string
	URL   string
}

type Detail struct {
	Label string
	Value string
}

type Message struct {
	Preheader  string
	Heading    string
	Intro      string
	Details    []Detail
	Action     *Action
	FooterNote string
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
	Message   Message
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
		Message:   message,
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
