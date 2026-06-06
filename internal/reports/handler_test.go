package reports

import (
	"context"
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/OZIOisgood/zeta/internal/auth"
	"github.com/OZIOisgood/zeta/internal/db"
	dbmocks "github.com/OZIOisgood/zeta/internal/db/mocks"
	"github.com/OZIOisgood/zeta/internal/permissions"
	"github.com/jackc/pgx/v5/pgtype"
	"go.uber.org/mock/gomock"
)

func reportTestUserCtx(ctx context.Context, user *auth.UserContext) context.Context {
	return context.WithValue(ctx, auth.UserKey, user)
}

func mustTS(t *testing.T, s string) pgtype.Timestamptz {
	t.Helper()
	parsed, err := time.Parse(time.RFC3339, s)
	if err != nil {
		t.Fatalf("parse %q: %v", s, err)
	}
	return pgtype.Timestamptz{Time: parsed, Valid: true}
}

func eventsRequest(t *testing.T, user *auth.UserContext) *http.Request {
	t.Helper()
	req := httptest.NewRequest(http.MethodGet, "/reports/events", nil)
	return req.WithContext(reportTestUserCtx(req.Context(), user))
}

// noPrefs makes every name lookup fall back to the raw id, keeping assertions
// independent of user_preferences content.
func noPrefs(q *dbmocks.MockQuerier) {
	q.EXPECT().GetUserPreferences(gomock.Any(), gomock.Any()).
		Return(db.UserPreference{}, errors.New("no prefs")).AnyTimes()
}

func TestEvents_StudentUsesStudentScopedQueries(t *testing.T) {
	ctrl := gomock.NewController(t)
	q := dbmocks.NewMockQuerier(ctrl)
	h := NewHandler(q, slog.Default())

	user := &auth.UserContext{ID: "student-1", Role: permissions.RoleStudent, Permissions: []string{permissions.ReportsRead}}
	noPrefs(q)

	q.EXPECT().ReportUploadEventsForStudent(gomock.Any(), user.ID).Return([]db.ReportUploadEventsForStudentRow{{
		Title: "Tee Shot", At: mustTS(t, "2026-06-03T18:00:00Z"),
		GroupName: "Heinrichs Gruppe", StudentID: user.ID, ExpertID: "expert-1", DurationSeconds: 120,
	}}, nil)
	q.EXPECT().ReportSessionEventsForStudent(gomock.Any(), user.ID).Return([]db.ReportSessionEventsForStudentRow{{
		Title: "Schwunganalyse", At: mustTS(t, "2026-06-04T10:00:00Z"),
		GroupName: "Heinrichs Gruppe", StudentID: user.ID, ExpertID: "expert-1", DurationMinutes: 45,
	}}, nil)
	// Expert-scoped queries must never run for a student.
	q.EXPECT().ReportUploadEventsForExpert(gomock.Any(), gomock.Any()).Times(0)
	q.EXPECT().ReportSessionEventsForExpert(gomock.Any(), gomock.Any()).Times(0)

	rec := httptest.NewRecorder()
	h.Events(rec, eventsRequest(t, user))

	if rec.Code != http.StatusOK {
		t.Fatalf("got %d, want %d", rec.Code, http.StatusOK)
	}
	var resp eventsResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &resp); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if resp.Role != "student" {
		t.Fatalf("got role %q, want student", resp.Role)
	}
	if len(resp.Events) != 2 {
		t.Fatalf("got %d events, want 2", len(resp.Events))
	}
	if resp.Events[0].Kind != "video" || resp.Events[0].DurationSeconds != 120 {
		t.Fatalf("unexpected video event: %+v", resp.Events[0])
	}
	if resp.Events[1].Kind != "live" || resp.Events[1].DurationSeconds != 45*60 {
		t.Fatalf("unexpected live event (minutes should convert to seconds): %+v", resp.Events[1])
	}
}

func TestEvents_ExpertUsesExpertScopedQueries(t *testing.T) {
	ctrl := gomock.NewController(t)
	q := dbmocks.NewMockQuerier(ctrl)
	h := NewHandler(q, slog.Default())

	user := &auth.UserContext{ID: "expert-1", Role: permissions.RoleExpert, Permissions: []string{permissions.ReportsRead}}
	noPrefs(q)

	q.EXPECT().ReportUploadEventsForExpert(gomock.Any(), user.ID).Return([]db.ReportUploadEventsForExpertRow{{
		Title: "Putting-Drill", At: mustTS(t, "2026-06-03T18:00:00Z"),
		GroupName: "Heinrichs Gruppe", StudentID: "student-1", ExpertID: user.ID, DurationSeconds: 300,
	}}, nil)
	q.EXPECT().ReportSessionEventsForExpert(gomock.Any(), user.ID).Return(nil, nil)
	q.EXPECT().ReportUploadEventsForStudent(gomock.Any(), gomock.Any()).Times(0)
	q.EXPECT().ReportSessionEventsForStudent(gomock.Any(), gomock.Any()).Times(0)

	rec := httptest.NewRecorder()
	h.Events(rec, eventsRequest(t, user))

	if rec.Code != http.StatusOK {
		t.Fatalf("got %d, want %d", rec.Code, http.StatusOK)
	}
	var resp eventsResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &resp); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if resp.Role != "expert" {
		t.Fatalf("got role %q, want expert", resp.Role)
	}
	if resp.Viewer.ID != user.ID {
		t.Fatalf("got viewer %q, want %q", resp.Viewer.ID, user.ID)
	}
	if len(resp.Events) != 1 || resp.Events[0].Student.ID != "student-1" {
		t.Fatalf("unexpected events: %+v", resp.Events)
	}
}

func TestEvents_Unauthenticated(t *testing.T) {
	ctrl := gomock.NewController(t)
	q := dbmocks.NewMockQuerier(ctrl)
	h := NewHandler(q, slog.Default())

	req := httptest.NewRequest(http.MethodGet, "/reports/events", nil)
	rec := httptest.NewRecorder()
	h.Events(rec, req)

	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("got %d, want %d", rec.Code, http.StatusUnauthorized)
	}
}
