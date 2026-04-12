package coaching

import (
	"context"
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"time"

	"github.com/OZIOisgood/zeta/internal/auth"
	"github.com/OZIOisgood/zeta/internal/db"
	"github.com/OZIOisgood/zeta/internal/logger"
	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgtype"
)

// --- DTO ---

type bookingResponse struct {
	ID                 string    `json:"id"`
	ExpertID           string    `json:"expert_id"`
	ExpertName         string    `json:"expert_name"`
	StudentID          string    `json:"student_id"`
	StudentName        string    `json:"student_name"`
	GroupID            string    `json:"group_id"`
	SessionTypeID      string    `json:"session_type_id"`
	SessionTypeName    string    `json:"session_type_name,omitempty"`
	ScheduledAt        time.Time `json:"scheduled_at"`
	DurationMinutes    int32     `json:"duration_minutes"`
	Status             string    `json:"status"` // "pending" | "done" | "cancelled"
	CancellationReason *string   `json:"cancellation_reason,omitempty"`
	CancelledBy        *string   `json:"cancelled_by,omitempty"`
	Notes              *string   `json:"notes,omitempty"`
	CreatedAt          time.Time `json:"created_at"`
}

// bookingStatus derives the logical status from stored data.
// No status field is persisted — only is_cancelled is stored.
func bookingStatus(scheduledAt time.Time, isCancelled bool) string {
	if isCancelled {
		return "cancelled"
	}
	if time.Now().After(scheduledAt) {
		return "done"
	}
	return "pending"
}

// --- Mappers ---

// buildBookingResponse fills a bookingResponse from common scalar fields.
func buildBookingResponse(
	id pgtype.UUID,
	expertID, studentID string,
	groupID, sessionTypeID pgtype.UUID,
	sessionTypeName string,
	scheduledAt pgtype.Timestamptz,
	durationMinutes int32,
	isCancelled bool,
	cancellationReason, cancelledBy, notes pgtype.Text,
	createdAt pgtype.Timestamptz,
	users map[string]userInfo,
) bookingResponse {
	expertUser := users[expertID]
	studentUser := users[studentID]

	resp := bookingResponse{
		ID:              uuidToString(id),
		ExpertID:        expertID,
		ExpertName:      expertUser.FirstName + " " + expertUser.LastName,
		StudentID:       studentID,
		StudentName:     studentUser.FirstName + " " + studentUser.LastName,
		GroupID:         uuidToString(groupID),
		SessionTypeID:   uuidToString(sessionTypeID),
		SessionTypeName: sessionTypeName,
		ScheduledAt:     scheduledAt.Time,
		DurationMinutes: durationMinutes,
		Status:          bookingStatus(scheduledAt.Time, isCancelled),
		CreatedAt:       createdAt.Time,
	}
	if cancellationReason.Valid {
		resp.CancellationReason = &cancellationReason.String
	}
	if cancelledBy.Valid {
		resp.CancelledBy = &cancelledBy.String
	}
	if notes.Valid {
		resp.Notes = &notes.String
	}
	return resp
}

func toBookingResponse(b db.CoachingBooking, users map[string]userInfo, sessionTypeName string) bookingResponse {
	return buildBookingResponse(
		b.ID, b.ExpertID, b.StudentID,
		b.GroupID, b.SessionTypeID, sessionTypeName,
		b.ScheduledAt, b.DurationMinutes, b.IsCancelled,
		b.CancellationReason, b.CancelledBy, b.Notes,
		b.CreatedAt, users,
	)
}

func toBookingResponseFromRow(b db.ListMyBookingsRow, users map[string]userInfo) bookingResponse {
	return buildBookingResponse(
		b.ID, b.ExpertID, b.StudentID,
		b.GroupID, b.SessionTypeID, b.SessionTypeName,
		b.ScheduledAt, b.DurationMinutes, b.IsCancelled,
		b.CancellationReason, b.CancelledBy, b.Notes,
		b.CreatedAt, users,
	)
}

func toBookingResponseFromGroupRow(b db.ListGroupBookingsRow, users map[string]userInfo) bookingResponse {
	return buildBookingResponse(
		b.ID, b.ExpertID, b.StudentID,
		b.GroupID, b.SessionTypeID, b.SessionTypeName,
		b.ScheduledAt, b.DurationMinutes, b.IsCancelled,
		b.CancellationReason, b.CancelledBy, b.Notes,
		b.CreatedAt, users,
	)
}

// --- Handlers ---

type createBookingRequest struct {
	ExpertID      string  `json:"expert_id"`
	SessionTypeID string  `json:"session_type_id"`
	ScheduledAt   string  `json:"scheduled_at"` // RFC3339
	Notes         *string `json:"notes,omitempty"`
}

func (h *Handler) CreateBooking(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	log := logger.From(ctx, h.logger)
	user := auth.GetUser(ctx)
	if user == nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	groupID, err := parseGroupID(r)
	if err != nil {
		http.Error(w, "Invalid group ID", http.StatusBadRequest)
		return
	}

	var req createBookingRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.ExpertID == "" {
		http.Error(w, "expert_id is required", http.StatusBadRequest)
		return
	}

	sessionTypeID, err := parseUUID(req.SessionTypeID)
	if err != nil {
		http.Error(w, "Invalid session_type_id", http.StatusBadRequest)
		return
	}

	sessionType, err := h.q.GetSessionType(ctx, db.GetSessionTypeParams{
		ID:      sessionTypeID,
		GroupID: groupID,
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			http.Error(w, "Session type not found", http.StatusNotFound)
			return
		}
		log.ErrorContext(ctx, "get_session_type_failed",
			slog.String("component", "coaching"),
			slog.Any("err", err),
		)
		http.Error(w, "Failed to get session type", http.StatusInternalServerError)
		return
	}

	scheduledAt, err := time.Parse(time.RFC3339, req.ScheduledAt)
	if err != nil {
		http.Error(w, "Invalid scheduled_at (use RFC3339)", http.StatusBadRequest)
		return
	}

	if time.Until(scheduledAt) < MinBookingNotice {
		http.Error(w, "Sessions must be booked at least 2 hours in advance", http.StatusBadRequest)
		return
	}

	var slotStart, slotEnd pgtype.Timestamptz
	_ = slotStart.Scan(scheduledAt)
	_ = slotEnd.Scan(scheduledAt.Add(time.Duration(sessionType.DurationMinutes) * time.Minute))

	var notes pgtype.Text
	if req.Notes != nil {
		notes = pgtype.Text{String: *req.Notes, Valid: true}
	}

	// TOCTOU-safe: SERIALIZABLE transaction, retry up to 3× on serialization failure.
	var booking db.CoachingBooking
	const maxRetries = 3
	for attempt := 0; attempt < maxRetries; attempt++ {
		tx, err := h.pool.BeginTx(ctx, pgx.TxOptions{IsoLevel: pgx.Serializable})
		if err != nil {
			log.ErrorContext(ctx, "begin_tx_failed", slog.String("component", "coaching"), slog.Any("err", err))
			http.Error(w, "Failed to create booking", http.StatusInternalServerError)
			return
		}

		qtx := h.q.WithTx(tx)

		conflicts, err := qtx.CountConflictingBookings(ctx, db.CountConflictingBookingsParams{
			ExpertID:      req.ExpertID,
			ScheduledAt:   slotStart,
			ScheduledAt_2: slotEnd,
		})
		if err != nil {
			_ = tx.Rollback(ctx)
			var pgErr *pgconn.PgError
			if errors.As(err, &pgErr) && pgErr.Code == "40001" && attempt < maxRetries-1 {
				continue
			}
			log.ErrorContext(ctx, "count_conflicts_failed", slog.String("component", "coaching"), slog.Any("err", err))
			http.Error(w, "Failed to check conflicts", http.StatusInternalServerError)
			return
		}
		if conflicts > 0 {
			_ = tx.Rollback(ctx)
			http.Error(w, "Time slot is no longer available", http.StatusConflict)
			return
		}

		booking, err = qtx.CreateBooking(ctx, db.CreateBookingParams{
			ExpertID:        req.ExpertID,
			StudentID:       user.ID,
			GroupID:         groupID,
			SessionTypeID:   sessionTypeID,
			ScheduledAt:     slotStart,
			DurationMinutes: sessionType.DurationMinutes,
			Notes:           notes,
		})
		if err != nil {
			_ = tx.Rollback(ctx)
			var pgErr *pgconn.PgError
			if errors.As(err, &pgErr) && pgErr.Code == "40001" && attempt < maxRetries-1 {
				continue
			}
			log.ErrorContext(ctx, "create_booking_failed", slog.String("component", "coaching"), slog.Any("err", err))
			http.Error(w, "Failed to create booking", http.StatusInternalServerError)
			return
		}

		if err = tx.Commit(ctx); err != nil {
			var pgErr *pgconn.PgError
			if errors.As(err, &pgErr) && pgErr.Code == "40001" && attempt < maxRetries-1 {
				continue
			}
			log.ErrorContext(ctx, "commit_booking_failed", slog.String("component", "coaching"), slog.Any("err", err))
			http.Error(w, "Failed to create booking", http.StatusInternalServerError)
			return
		}
		break
	}

	h.sendBookingCreatedEmail(ctx, booking)

	users := h.resolveUsers(ctx, []string{booking.ExpertID, booking.StudentID})
	writeJSON(w, http.StatusCreated, toBookingResponse(booking, users, sessionType.Name))
}

func (h *Handler) ListMyBookings(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	log := logger.From(ctx, h.logger)
	user := auth.GetUser(ctx)
	if user == nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	groupID, err := parseGroupID(r)
	if err != nil {
		http.Error(w, "Invalid group ID", http.StatusBadRequest)
		return
	}

	bookings, err := h.q.ListMyBookings(ctx, db.ListMyBookingsParams{
		ExpertID: user.ID,
		GroupID:  groupID,
	})
	if err != nil {
		log.ErrorContext(ctx, "list_bookings_failed",
			slog.String("component", "coaching"),
			slog.String("user_id", user.ID),
			slog.Any("err", err),
		)
		http.Error(w, "Failed to list bookings", http.StatusInternalServerError)
		return
	}

	if bookings == nil {
		bookings = []db.ListMyBookingsRow{}
	}

	pairs := make([][2]string, len(bookings))
	for i, b := range bookings {
		pairs[i] = [2]string{b.ExpertID, b.StudentID}
	}
	users := h.resolveUsers(ctx, collectUserIDs(pairs))

	resp := make([]bookingResponse, len(bookings))
	for i, b := range bookings {
		resp[i] = toBookingResponseFromRow(b, users)
	}

	writeJSON(w, http.StatusOK, resp)
}

func (h *Handler) ListGroupSessions(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	log := logger.From(ctx, h.logger)
	user := auth.GetUser(ctx)
	if user == nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	groupID, err := parseGroupID(r)
	if err != nil {
		http.Error(w, "Invalid group ID", http.StatusBadRequest)
		return
	}

	bookings, err := h.q.ListGroupBookings(ctx, groupID)
	if err != nil {
		log.ErrorContext(ctx, "list_group_sessions_failed",
			slog.String("component", "coaching"),
			slog.Any("err", err),
		)
		http.Error(w, "Failed to list group sessions", http.StatusInternalServerError)
		return
	}

	if bookings == nil {
		bookings = []db.ListGroupBookingsRow{}
	}

	pairs := make([][2]string, len(bookings))
	for i, b := range bookings {
		pairs[i] = [2]string{b.ExpertID, b.StudentID}
	}
	users := h.resolveUsers(ctx, collectUserIDs(pairs))

	resp := make([]bookingResponse, len(bookings))
	for i, b := range bookings {
		resp[i] = toBookingResponseFromGroupRow(b, users)
	}

	writeJSON(w, http.StatusOK, resp)
}

type cancelBookingRequest struct {
	CancellationReason *string `json:"cancellation_reason,omitempty"`
}

func (h *Handler) CancelBooking(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	log := logger.From(ctx, h.logger)
	user := auth.GetUser(ctx)
	if user == nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	bookingID, err := parseUUID(chi.URLParam(r, "bookingID"))
	if err != nil {
		http.Error(w, "Invalid booking ID", http.StatusBadRequest)
		return
	}

	var req cancelBookingRequest
	if r.ContentLength != 0 {
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "Invalid request body", http.StatusBadRequest)
			return
		}
	}

	// GetBooking is scoped to expert_id OR student_id — ensures caller is a participant.
	existing, err := h.q.GetBooking(ctx, db.GetBookingParams{
		ID:       bookingID,
		ExpertID: user.ID,
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			http.Error(w, "Booking not found", http.StatusNotFound)
			return
		}
		http.Error(w, "Failed to fetch booking", http.StatusInternalServerError)
		return
	}

	if existing.IsCancelled {
		http.Error(w, "Booking is already cancelled", http.StatusConflict)
		return
	}

	if time.Until(existing.ScheduledAt.Time) < CancellationNotice {
		http.Error(w, "Cancellations must be made at least 1 hour before the session", http.StatusBadRequest)
		return
	}

	var cancelReason pgtype.Text
	if req.CancellationReason != nil {
		cancelReason = pgtype.Text{String: *req.CancellationReason, Valid: true}
	}

	updated, err := h.q.CancelBooking(ctx, db.CancelBookingParams{
		ID:                 bookingID,
		CancellationReason: cancelReason,
		CancelledBy:        pgtype.Text{String: user.ID, Valid: true},
		ExpertID:           user.ID,
	})
	if err != nil {
		log.ErrorContext(ctx, "cancel_booking_failed",
			slog.String("component", "coaching"),
			slog.Any("err", err),
		)
		http.Error(w, "Failed to cancel booking", http.StatusInternalServerError)
		return
	}

	h.sendCancellationEmail(ctx, updated, user.ID)

	users := h.resolveUsers(ctx, []string{updated.ExpertID, updated.StudentID})
	writeJSON(w, http.StatusOK, toBookingResponse(updated, users, ""))
}

// --- Email stubs ---

func (h *Handler) sendBookingCreatedEmail(ctx context.Context, b db.CoachingBooking) {
	log := logger.From(ctx, h.logger)
	scheduledStr := b.ScheduledAt.Time.UTC().Format("Monday, January 2, 2006 at 15:04 UTC")
	subject := "Live Coaching Session Confirmed"
	body := "Your live coaching session has been confirmed.\n\nDate & Time: " + scheduledStr +
		"\nDuration: " + formatDuration(b.DurationMinutes)

	log.InfoContext(ctx, "booking_created_email_queued",
		slog.String("component", "coaching"),
		slog.String("expert_id", b.ExpertID),
		slog.String("student_id", b.StudentID),
		slog.String("scheduled_at", scheduledStr),
	)
	_ = subject
	_ = body
}

func (h *Handler) sendCancellationEmail(ctx context.Context, b db.CoachingBooking, cancelledByID string) {
	log := logger.From(ctx, h.logger)
	scheduledStr := b.ScheduledAt.Time.UTC().Format("Monday, January 2, 2006 at 15:04 UTC")
	log.InfoContext(ctx, "booking_cancelled_email_queued",
		slog.String("component", "coaching"),
		slog.String("expert_id", b.ExpertID),
		slog.String("student_id", b.StudentID),
		slog.String("cancelled_by", cancelledByID),
		slog.String("scheduled_at", scheduledStr),
	)
}
