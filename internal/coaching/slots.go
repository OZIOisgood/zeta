package coaching

import (
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"time"

	"github.com/OZIOisgood/zeta/internal/auth"
	"github.com/OZIOisgood/zeta/internal/db"
	"github.com/OZIOisgood/zeta/internal/logger"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
)

// ExpertInfo is the public shape returned by ListExpertsInGroup.
type ExpertInfo struct {
	ExpertID  string `json:"expert_id"`
	FirstName string `json:"first_name"`
	LastName  string `json:"last_name"`
	Avatar    string `json:"avatar,omitempty"`
}

func (h *Handler) ListExpertsInGroup(w http.ResponseWriter, r *http.Request) {
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

	expertIDs, err := h.q.ListActiveExpertsInGroup(ctx, groupID)
	if err != nil {
		log.ErrorContext(ctx, "list_experts_failed",
			slog.String("component", "coaching"),
			slog.Any("err", err),
		)
		http.Error(w, "Failed to list experts", http.StatusInternalServerError)
		return
	}

	if expertIDs == nil {
		expertIDs = []string{}
	}

	users := h.resolveUsers(ctx, expertIDs)

	resp := make([]ExpertInfo, len(expertIDs))
	for i, id := range expertIDs {
		u := users[id]
		resp[i] = ExpertInfo{
			ExpertID:  id,
			FirstName: u.FirstName,
			LastName:  u.LastName,
			Avatar:    u.Avatar,
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp) //nolint:errcheck
}

// SlotResponse is the public shape of a computed availability slot.
type SlotResponse struct {
	ExpertID string    `json:"expert_id"`
	StartsAt time.Time `json:"starts_at"`
	EndsAt   time.Time `json:"ends_at"`
	Duration int32     `json:"duration_minutes"`
}

func (h *Handler) ListAvailableSlots(w http.ResponseWriter, r *http.Request) {
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

	expertID := r.URL.Query().Get("expert_id")
	if expertID == "" {
		http.Error(w, "expert_id query param required", http.StatusBadRequest)
		return
	}

	sessionTypeIDStr := r.URL.Query().Get("session_type_id")
	if sessionTypeIDStr == "" {
		http.Error(w, "session_type_id query param required", http.StatusBadRequest)
		return
	}
	sessionTypeID, err := parseUUID(sessionTypeIDStr)
	if err != nil {
		http.Error(w, "Invalid session_type_id", http.StatusBadRequest)
		return
	}

	// Load session type to get duration.
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

	// Compute slots for the next SlotLookaheadDays days.
	now := time.Now().UTC()
	rangeStart := now
	rangeEnd := now.AddDate(0, 0, SlotLookaheadDays)

	// 1. Get expert's timezone.
	tz, err := h.q.GetUserTimezone(ctx, expertID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			tz = "UTC"
		} else {
			log.ErrorContext(ctx, "get_timezone_failed",
				slog.String("component", "coaching"),
				slog.String("expert_id", expertID),
				slog.Any("err", err),
			)
			http.Error(w, "Failed to get expert timezone", http.StatusInternalServerError)
			return
		}
	}

	loc, err := time.LoadLocation(tz)
	if err != nil {
		loc = time.UTC
	}

	// 2. Fetch active availability.
	avail, err := h.q.ListAvailabilityByExpertGroup(ctx, db.ListAvailabilityByExpertGroupParams{
		ExpertID: expertID,
		GroupID:  groupID,
	})
	if err != nil {
		log.ErrorContext(ctx, "list_availability_slots_failed",
			slog.String("component", "coaching"),
			slog.Any("err", err),
		)
		http.Error(w, "Failed to list availability", http.StatusInternalServerError)
		return
	}

	// 3. Fetch blocked slots in range.
	var fromDate, toDate pgtype.Date
	_ = fromDate.Scan(rangeStart.Format("2006-01-02"))
	_ = toDate.Scan(rangeEnd.Format("2006-01-02"))
	blocked, err := h.q.ListBlockedSlots(ctx, db.ListBlockedSlotsParams{
		ExpertID: expertID,
		FromDate: fromDate,
		ToDate:   toDate,
	})
	if err != nil {
		log.ErrorContext(ctx, "list_blocked_slots_for_slots_failed",
			slog.String("component", "coaching"),
			slog.Any("err", err),
		)
		http.Error(w, "Failed to list blocked slots", http.StatusInternalServerError)
		return
	}

	// 4. Fetch existing bookings in range.
	var pgRangeStart, pgRangeEnd pgtype.Timestamptz
	_ = pgRangeStart.Scan(rangeStart)
	_ = pgRangeEnd.Scan(rangeEnd)
	bookings, err := h.q.ListBookingsByExpertInRange(ctx, db.ListBookingsByExpertInRangeParams{
		ExpertID:      expertID,
		ScheduledAt:   pgRangeStart,
		ScheduledAt_2: pgRangeEnd,
	})
	if err != nil {
		log.ErrorContext(ctx, "list_bookings_for_slots_failed",
			slog.String("component", "coaching"),
			slog.Any("err", err),
		)
		http.Error(w, "Failed to list bookings", http.StatusInternalServerError)
		return
	}

	// 5. Compute slots using the session type's duration.
	minNotice := now.Add(MinBookingNotice)
	slots := computeSlots(avail, blocked, bookings, loc, rangeStart, rangeEnd, minNotice, sessionType.DurationMinutes)
	if slots == nil {
		slots = []SlotResponse{}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(slots) //nolint:errcheck
}

// computeSlots generates available slot windows for an expert given a specific session duration.
func computeSlots(
	avail []db.CoachingAvailability,
	blocked []db.CoachingBlockedSlot,
	bookings []db.CoachingBooking,
	loc *time.Location,
	rangeStart, rangeEnd, minNotice time.Time,
	durationMinutes int32,
) []SlotResponse {
	duration := time.Duration(durationMinutes) * time.Minute

	// Index availability by day_of_week.
	byDay := make(map[int16][]db.CoachingAvailability)
	for _, a := range avail {
		byDay[a.DayOfWeek] = append(byDay[a.DayOfWeek], a)
	}

	// Index blocked slots by date string.
	blockedByDate := make(map[string][]db.CoachingBlockedSlot)
	for _, b := range blocked {
		key := b.BlockedDate.Time.Format("2006-01-02")
		blockedByDate[key] = append(blockedByDate[key], b)
	}

	var slots []SlotResponse
	for d := rangeStart; d.Before(rangeEnd); d = d.AddDate(0, 0, 1) {
		// day_of_week: 0=Sun … 6=Sat
		dow := int16(d.Weekday())
		dayAvail, ok := byDay[dow]
		if !ok {
			continue
		}

		dateKey := d.Format("2006-01-02")
		blockedToday := blockedByDate[dateKey]

		for _, a := range dayAvail {
			startH, startM := pgTimeParts(a.StartTime)
			endH, endM := pgTimeParts(a.EndTime)

			windowStart := time.Date(d.Year(), d.Month(), d.Day(), startH, startM, 0, 0, loc).UTC()
			windowEnd := time.Date(d.Year(), d.Month(), d.Day(), endH, endM, 0, 0, loc).UTC()

			for slotStart := windowStart; !slotStart.Add(duration).After(windowEnd); slotStart = slotStart.Add(duration) {
				slotEnd := slotStart.Add(duration)

				// Skip past slots or within minimum notice.
				if slotEnd.Before(minNotice) {
					continue
				}

				if isBlocked(slotStart, slotEnd, blockedToday, loc) {
					continue
				}

				if overlapsBooking(slotStart, slotEnd, bookings) {
					continue
				}

				slots = append(slots, SlotResponse{
					ExpertID: a.ExpertID,
					StartsAt: slotStart,
					EndsAt:   slotEnd,
					Duration: durationMinutes,
				})
			}
		}
	}

	return slots
}

func isBlocked(slotStart, slotEnd time.Time, blockedSlots []db.CoachingBlockedSlot, loc *time.Location) bool {
	for _, b := range blockedSlots {
		// Full-day block: no time range set.
		if !b.StartTime.Valid || !b.EndTime.Valid {
			return true
		}

		bDate := b.BlockedDate.Time
		bStartH, bStartM := pgTimeParts(b.StartTime)
		bEndH, bEndM := pgTimeParts(b.EndTime)

		blockStart := time.Date(bDate.Year(), bDate.Month(), bDate.Day(), bStartH, bStartM, 0, 0, loc).UTC()
		blockEnd := time.Date(bDate.Year(), bDate.Month(), bDate.Day(), bEndH, bEndM, 0, 0, loc).UTC()

		if slotStart.Before(blockEnd) && slotEnd.After(blockStart) {
			return true
		}
	}
	return false
}

func overlapsBooking(slotStart, slotEnd time.Time, bookings []db.CoachingBooking) bool {
	for _, b := range bookings {
		bookingStart := b.ScheduledAt.Time
		bookingEnd := bookingStart.Add(time.Duration(b.DurationMinutes) * time.Minute)
		if slotStart.Before(bookingEnd) && slotEnd.After(bookingStart) {
			return true
		}
	}
	return false
}
