package reports

import (
	"context"
	"encoding/json"
	"log/slog"
	"net/http"
	"time"

	"github.com/OZIOisgood/zeta/internal/auth"
	"github.com/OZIOisgood/zeta/internal/db"
	"github.com/OZIOisgood/zeta/internal/logger"
	"github.com/OZIOisgood/zeta/internal/permissions"
	"github.com/OZIOisgood/zeta/internal/pgutil"
	"github.com/OZIOisgood/zeta/internal/preferences"
	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgtype"
)

// Handler serves the authenticated user's activity as a flat event list. Every
// query is scoped to the requester's own id, so a user only ever sees their data.
// The frontend nests, aggregates and period-filters the events (buildReport).
type Handler struct {
	q      db.Querier
	logger *slog.Logger
}

func NewHandler(q db.Querier, logger *slog.Logger) *Handler {
	return &Handler{q: q, logger: logger}
}

func (h *Handler) RegisterRoutes(r chi.Router) {
	r.Group(func(r chi.Router) {
		r.Use(auth.RequirePermission(permissions.ReportsRead))
		r.Get("/reports/events", h.Events)
	})
}

type ref struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

// event is one report row: a video upload or a live coaching. Both carry the
// group, the student and the expert so the client can nest under either leaf.
// duration_seconds unifies video length and (minutes×60) session length.
type event struct {
	Kind            string    `json:"kind"`
	Group           ref       `json:"group"`
	Student         ref       `json:"student"`
	Expert          ref       `json:"expert"`
	Title           string    `json:"title"`
	At              time.Time `json:"at"`
	DurationSeconds float64   `json:"duration_seconds"`
}

type eventsResponse struct {
	Role   string  `json:"role"`
	Viewer ref     `json:"viewer"`
	Events []event `json:"events"`
}

// Events returns every video upload and live coaching for the user. Experts see
// activity in groups they own; students see their own. Role is derived from the
// authenticated user so each role page is fixed to its viewpoint.
func (h *Handler) Events(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	log := logger.From(ctx, h.logger)
	user := auth.GetUser(ctx)
	if user == nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	role := "expert"
	if user.Role == permissions.RoleStudent {
		role = "student"
	}

	names := newNameResolver(h.q)
	resp := eventsResponse{
		Role:   role,
		Viewer: names.ref(ctx, user.ID),
		Events: []event{},
	}

	if role == "student" {
		uploads, err := h.q.ReportUploadEventsForStudent(ctx, user.ID)
		if err != nil {
			h.fail(ctx, log, w, "report_uploads_student_failed", err)
			return
		}
		for _, u := range uploads {
			resp.Events = append(resp.Events, event{
				Kind:            "video",
				Group:           ref{ID: pgutil.UUIDToString(u.GroupID), Name: u.GroupName},
				Student:         names.ref(ctx, u.StudentID),
				Expert:          names.ref(ctx, u.ExpertID),
				Title:           u.Title,
				At:              u.At.Time,
				DurationSeconds: u.DurationSeconds,
			})
		}

		sessions, err := h.q.ReportSessionEventsForStudent(ctx, user.ID)
		if err != nil {
			h.fail(ctx, log, w, "report_sessions_student_failed", err)
			return
		}
		for _, s := range sessions {
			resp.Events = append(resp.Events, sessionEvent(ctx, names, s.GroupID, s.GroupName, s.StudentID, s.ExpertID, s.Title, s.At, s.DurationMinutes))
		}
	} else {
		uploads, err := h.q.ReportUploadEventsForExpert(ctx, user.ID)
		if err != nil {
			h.fail(ctx, log, w, "report_uploads_expert_failed", err)
			return
		}
		for _, u := range uploads {
			resp.Events = append(resp.Events, event{
				Kind:            "video",
				Group:           ref{ID: pgutil.UUIDToString(u.GroupID), Name: u.GroupName},
				Student:         names.ref(ctx, u.StudentID),
				Expert:          names.ref(ctx, u.ExpertID),
				Title:           u.Title,
				At:              u.At.Time,
				DurationSeconds: u.DurationSeconds,
			})
		}

		sessions, err := h.q.ReportSessionEventsForExpert(ctx, user.ID)
		if err != nil {
			h.fail(ctx, log, w, "report_sessions_expert_failed", err)
			return
		}
		for _, s := range sessions {
			resp.Events = append(resp.Events, sessionEvent(ctx, names, s.GroupID, s.GroupName, s.StudentID, s.ExpertID, s.Title, s.At, s.DurationMinutes))
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}

// sessionEvent builds a live-coaching event, converting minutes to seconds so
// the unified duration field carries comparable values across event kinds.
func sessionEvent(
	ctx context.Context,
	names *nameResolver,
	groupID pgtype.UUID,
	groupName, studentID, expertID, title string,
	at pgtype.Timestamptz,
	durationMinutes int32,
) event {
	return event{
		Kind:            "live",
		Group:           ref{ID: pgutil.UUIDToString(groupID), Name: groupName},
		Student:         names.ref(ctx, studentID),
		Expert:          names.ref(ctx, expertID),
		Title:           title,
		At:              at.Time,
		DurationSeconds: float64(durationMinutes) * 60,
	}
}

func (h *Handler) fail(ctx context.Context, log *slog.Logger, w http.ResponseWriter, event string, err error) {
	log.ErrorContext(ctx, event,
		slog.String("component", "reports"),
		slog.Any("err", err),
	)
	http.Error(w, "Failed to build report", http.StatusInternalServerError)
}

// nameResolver caches WorkOS-id → display-name lookups for a single request.
type nameResolver struct {
	q     db.Querier
	cache map[string]string
}

func newNameResolver(q db.Querier) *nameResolver {
	return &nameResolver{q: q, cache: make(map[string]string)}
}

// ref resolves a user id to a display reference, falling back to the id when the
// profile or name is unavailable. Never returns an error — a missing name must
// not break a report.
func (n *nameResolver) ref(ctx context.Context, id string) ref {
	if id == "" {
		return ref{}
	}
	if name, ok := n.cache[id]; ok {
		return ref{ID: id, Name: name}
	}
	name := id
	if prefs, err := n.q.GetUserPreferences(ctx, id); err == nil {
		if dn := preferences.DisplayName(prefs); dn != "" {
			name = dn
		}
	}
	n.cache[id] = name
	return ref{ID: id, Name: name}
}
