package coaching

import (
	"context"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/OZIOisgood/zeta/internal/auth"
	"github.com/OZIOisgood/zeta/internal/db"
	dbmocks "github.com/OZIOisgood/zeta/internal/db/mocks"
	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"go.uber.org/mock/gomock"
)

func TestEndBookingAllowsActiveSessionExpert(t *testing.T) {
	ctrl := gomock.NewController(t)
	q := dbmocks.NewMockQuerier(ctrl)
	h := NewHandler(q, nil, nil, nil, slog.Default(), HandlerConfig{})
	booking := activeBookingForEndTest(t)

	q.EXPECT().GetBooking(gomock.Any(), db.GetBookingParams{ID: booking.ID, ExpertID: "expert-1"}).Return(booking, nil)
	q.EXPECT().EndBooking(gomock.Any(), gomock.Any()).Return(booking, nil)

	recorder := httptest.NewRecorder()
	h.EndBooking(recorder, coachingRequestWithUser(http.MethodPost, booking.ID, "expert-1"))

	if recorder.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d; body = %s", recorder.Code, http.StatusOK, recorder.Body.String())
	}
}

func TestEndBookingRejectsStudent(t *testing.T) {
	ctrl := gomock.NewController(t)
	q := dbmocks.NewMockQuerier(ctrl)
	h := NewHandler(q, nil, nil, nil, slog.Default(), HandlerConfig{})
	booking := activeBookingForEndTest(t)

	q.EXPECT().GetBooking(gomock.Any(), db.GetBookingParams{ID: booking.ID, ExpertID: "student-1"}).Return(booking, nil)

	recorder := httptest.NewRecorder()
	h.EndBooking(recorder, coachingRequestWithUser(http.MethodPost, booking.ID, "student-1"))

	if recorder.Code != http.StatusForbidden {
		t.Fatalf("status = %d, want %d", recorder.Code, http.StatusForbidden)
	}
}

func TestConnectToBookingRejectsEndedSession(t *testing.T) {
	ctrl := gomock.NewController(t)
	q := dbmocks.NewMockQuerier(ctrl)
	h := NewHandler(q, nil, nil, nil, slog.Default(), HandlerConfig{})
	booking := activeBookingForEndTest(t)
	booking.EndedAt = pgtype.Timestamptz{Time: time.Now(), Valid: true}

	q.EXPECT().GetBooking(gomock.Any(), db.GetBookingParams{ID: booking.ID, ExpertID: "student-1"}).Return(booking, nil)

	recorder := httptest.NewRecorder()
	h.ConnectToBooking(recorder, coachingRequestWithUser(http.MethodGet, booking.ID, "student-1"))

	if recorder.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, want %d", recorder.Code, http.StatusBadRequest)
	}
}

func TestBookingInProgress(t *testing.T) {
	now := time.Date(2026, 7, 13, 20, 0, 0, 0, time.UTC)
	booking := db.CoachingBooking{
		ScheduledAt:     pgtype.Timestamptz{Time: now.Add(-15 * time.Minute), Valid: true},
		DurationMinutes: 30,
	}

	if !bookingInProgress(booking, now) {
		t.Fatal("booking should be in progress")
	}
	if bookingInProgress(booking, now.Add(15*time.Minute)) {
		t.Fatal("booking should not be in progress at its end")
	}
}

func activeBookingForEndTest(t *testing.T) db.CoachingBooking {
	t.Helper()
	id, err := parseUUID("11111111-1111-1111-1111-111111111111")
	if err != nil {
		t.Fatal(err)
	}
	return db.CoachingBooking{
		ID:              id,
		ExpertID:        "expert-1",
		StudentID:       "student-1",
		ScheduledAt:     pgtype.Timestamptz{Time: time.Now().Add(-5 * time.Minute), Valid: true},
		DurationMinutes: 30,
	}
}

func coachingRequestWithUser(method string, bookingID pgtype.UUID, userID string) *http.Request {
	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("bookingID", uuidToString(bookingID))
	req := httptest.NewRequest(method, "/", nil)
	ctx := context.WithValue(req.Context(), auth.UserKey, &auth.UserContext{ID: userID})
	ctx = context.WithValue(ctx, chi.RouteCtxKey, rctx)
	return req.WithContext(ctx)
}
