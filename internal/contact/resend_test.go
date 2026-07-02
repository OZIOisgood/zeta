package contact

import (
	"strings"
	"testing"

	"github.com/OZIOisgood/zeta/internal/db"
)

func TestSupportRequestUsesInboundPipelineWithoutCC(t *testing.T) {
	sender := NewResendSender("test-key", "notifications@strido.net", "support@strido.net")
	request := sender.supportRequest(contactSubmission("en"))

	if len(request.To) != 1 || request.To[0] != "support@strido.net" {
		t.Fatalf("To = %v, want only support inbox", request.To)
	}
	if len(request.Cc) != 0 {
		t.Fatalf("Cc = %v, want no direct copies", request.Cc)
	}
	if request.ReplyTo != "ada@example.com" {
		t.Fatalf("ReplyTo = %q, want submitter", request.ReplyTo)
	}
}

func TestAcknowledgementRequestUsesSubmitterAndLocale(t *testing.T) {
	sender := NewResendSender("test-key", "notifications@strido.net", "support@strido.net")
	request, err := sender.acknowledgementRequest(contactSubmission("fr"))
	if err != nil {
		t.Fatalf("build acknowledgement: %v", err)
	}

	if len(request.To) != 1 || request.To[0] != "ada@example.com" {
		t.Fatalf("To = %v, want only submitter", request.To)
	}
	if request.Subject != "Nous avons reçu votre message" {
		t.Fatalf("Subject = %q, want French confirmation", request.Subject)
	}
	if !strings.Contains(request.Html, "Bonjour") || !strings.Contains(request.Text, "Ada Coach") {
		t.Fatal("acknowledgement did not render localized, personalized content")
	}
}

func contactSubmission(locale string) db.LandingContactSubmission {
	return db.LandingContactSubmission{
		ID:      testUUID(),
		Name:    "Ada Coach",
		Email:   "ada@example.com",
		Message: "Hello support",
		Locale:  locale,
		PageUrl: "https://strido.net/en/contact.html",
	}
}
