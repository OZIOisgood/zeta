//go:build integration

package reports_test

import (
	"context"
	"testing"

	"github.com/OZIOisgood/zeta/internal/db"
	"github.com/OZIOisgood/zeta/internal/testdb"
	"github.com/jackc/pgx/v5/pgtype"
)

func TestIntegration_ReportExpertEvents(t *testing.T) {
	pool := testdb.New(t)
	q := db.New(pool)
	ctx := context.Background()

	const expertID = "expert-1"
	const studentID = "student-1"

	var groupID pgtype.UUID
	if err := pool.QueryRow(ctx,
		`INSERT INTO groups (name, owner_id, avatar, description) VALUES ('Academy', $1, '', '') RETURNING id`,
		expertID,
	).Scan(&groupID); err != nil {
		t.Fatalf("insert group: %v", err)
	}

	var assetID pgtype.UUID
	if err := pool.QueryRow(ctx,
		`INSERT INTO assets (name, description, status, group_id, owner_id, created_at)
		 VALUES ('Jump form', '', 'completed', $1, $2, NOW() - INTERVAL '30 days') RETURNING id`,
		groupID, studentID,
	).Scan(&assetID); err != nil {
		t.Fatalf("insert asset: %v", err)
	}

	// Two video parts on one asset — the upload event must sum their durations.
	if _, err := pool.Exec(ctx,
		`INSERT INTO videos (asset_id, mux_upload_id, status, duration_seconds, created_at)
		 VALUES ($1, 'upload-1', 'ready', 80, NOW()), ($1, 'upload-2', 'ready', 40, NOW())`,
		assetID,
	); err != nil {
		t.Fatalf("insert videos: %v", err)
	}

	var sessionTypeID pgtype.UUID
	if err := pool.QueryRow(ctx,
		`INSERT INTO coaching_session_types (expert_id, group_id, name, description, duration_minutes)
		 VALUES ($1, $2, 'Standard', '', 45) RETURNING id`,
		expertID, groupID,
	).Scan(&sessionTypeID); err != nil {
		t.Fatalf("insert session type: %v", err)
	}

	if _, err := pool.Exec(ctx,
		`INSERT INTO coaching_bookings (expert_id, student_id, group_id, session_type_id, scheduled_at, duration_minutes)
		 VALUES ($1, $2, $3, $4, NOW() - INTERVAL '7 days', 45)`,
		expertID, studentID, groupID, sessionTypeID,
	); err != nil {
		t.Fatalf("insert booking: %v", err)
	}

	uploads, err := q.ReportUploadEventsForExpert(ctx, expertID)
	if err != nil {
		t.Fatalf("ReportUploadEventsForExpert: %v", err)
	}
	if len(uploads) != 1 {
		t.Fatalf("uploads: got %d rows, want 1", len(uploads))
	}
	if uploads[0].DurationSeconds != 120 {
		t.Fatalf("uploads[0].DurationSeconds = %v, want 120 (80+40)", uploads[0].DurationSeconds)
	}
	if uploads[0].StudentID != studentID || uploads[0].ExpertID != expertID {
		t.Fatalf("uploads[0] leaves: student=%q expert=%q, want %q / %q",
			uploads[0].StudentID, uploads[0].ExpertID, studentID, expertID)
	}
	if uploads[0].Title != "Jump form" {
		t.Fatalf("uploads[0].Title = %q, want %q", uploads[0].Title, "Jump form")
	}

	sessions, err := q.ReportSessionEventsForExpert(ctx, expertID)
	if err != nil {
		t.Fatalf("ReportSessionEventsForExpert: %v", err)
	}
	if len(sessions) != 1 {
		t.Fatalf("sessions: got %d rows, want 1", len(sessions))
	}
	if sessions[0].DurationMinutes != 45 || sessions[0].Title != "Standard" {
		t.Fatalf("sessions[0]: minutes=%d title=%q, want 45 / Standard",
			sessions[0].DurationMinutes, sessions[0].Title)
	}
	if sessions[0].StudentID != studentID {
		t.Fatalf("sessions[0].StudentID = %q, want %q", sessions[0].StudentID, studentID)
	}

	// The student-scoped query must see the same upload from the student's side.
	studentUploads, err := q.ReportUploadEventsForStudent(ctx, studentID)
	if err != nil {
		t.Fatalf("ReportUploadEventsForStudent: %v", err)
	}
	if len(studentUploads) != 1 || studentUploads[0].ExpertID != expertID {
		t.Fatalf("studentUploads: got %+v, want 1 row with expert %q", studentUploads, expertID)
	}
}
