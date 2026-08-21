package api

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/go-chi/cors"
)

func TestCORSAllowsDashboardPatchPreflight(t *testing.T) {
	t.Setenv("ALLOWED_ORIGINS", "https://app.dev.strido.net")
	handler := cors.Handler(corsOptions())(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusNoContent)
	}))
	req := httptest.NewRequest(http.MethodOptions, "/admin/emails/email-id", nil)
	req.Header.Set("Origin", "https://app.dev.strido.net")
	req.Header.Set("Access-Control-Request-Method", http.MethodPatch)
	req.Header.Set("Access-Control-Request-Headers", "content-type")
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("preflight status = %d, want %d", rec.Code, http.StatusOK)
	}
	if got := rec.Header().Get("Access-Control-Allow-Origin"); got != "https://app.dev.strido.net" {
		t.Fatalf("Access-Control-Allow-Origin = %q", got)
	}
	if got := rec.Header().Get("Access-Control-Allow-Methods"); got != http.MethodPatch {
		t.Fatalf("Access-Control-Allow-Methods = %q, want PATCH", got)
	}
}

func TestSplitCSVAcceptsCloudRunSafeSemicolonSeparator(t *testing.T) {
	got := splitCSV("first@example.com; second@example.com")
	if len(got) != 2 || got[0] != "first@example.com" || got[1] != "second@example.com" {
		t.Fatalf("splitCSV() = %#v", got)
	}
}
