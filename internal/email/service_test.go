package email

import (
	"log/slog"
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
