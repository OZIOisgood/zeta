//go:build integration

package groups_test

import (
	"context"
	"encoding/json"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/OZIOisgood/zeta/internal/auth"
	"github.com/OZIOisgood/zeta/internal/db"
	"github.com/OZIOisgood/zeta/internal/groups"
	"github.com/OZIOisgood/zeta/internal/permissions"
	"github.com/OZIOisgood/zeta/internal/testdb"
)

func adminCtx(ctx context.Context) context.Context {
	return context.WithValue(ctx, auth.UserKey, &auth.UserContext{
		ID:          "user-abc",
		Email:       "admin@test.com",
		Role:        "admin",
		Permissions: []string{permissions.GroupsCreate, permissions.GroupsRead},
	})
}

func TestIntegration_CreateAndListGroups(t *testing.T) {
	pool := testdb.New(t)
	q := db.New(pool)
	h := groups.NewHandler(q, slog.Default())

	// Create group
	body := `{"name":"Integration Group","description":"test","avatar":"base64img"}`
	req := httptest.NewRequest(http.MethodPost, "/groups", strings.NewReader(body))
	req = req.WithContext(adminCtx(req.Context()))
	rec := httptest.NewRecorder()
	h.CreateGroup(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("CreateGroup: got %d, want %d; body: %s", rec.Code, http.StatusOK, rec.Body.String())
	}

	var created map[string]interface{}
	if err := json.NewDecoder(rec.Body).Decode(&created); err != nil {
		t.Fatalf("decode create response: %v", err)
	}
	if created["name"] != "Integration Group" {
		t.Errorf("name = %q, want %q", created["name"], "Integration Group")
	}
	if created["id"] == nil || created["id"] == "" {
		t.Error("expected non-empty group id")
	}

	// List groups — the created group should appear
	req2 := httptest.NewRequest(http.MethodGet, "/groups", nil)
	req2 = req2.WithContext(adminCtx(req2.Context()))
	rec2 := httptest.NewRecorder()
	h.ListGroups(rec2, req2)

	if rec2.Code != http.StatusOK {
		t.Fatalf("ListGroups: got %d, want %d; body: %s", rec2.Code, http.StatusOK, rec2.Body.String())
	}

	var listed []map[string]interface{}
	if err := json.NewDecoder(rec2.Body).Decode(&listed); err != nil {
		t.Fatalf("decode list response: %v", err)
	}
	if len(listed) != 1 {
		t.Fatalf("got %d groups, want 1", len(listed))
	}
	if listed[0]["name"] != "Integration Group" {
		t.Errorf("listed name = %q, want %q", listed[0]["name"], "Integration Group")
	}
}
