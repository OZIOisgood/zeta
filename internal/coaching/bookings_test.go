package coaching

import (
	"testing"
	"time"

	"github.com/jackc/pgx/v5/pgtype"
)

func TestBookingStatus(t *testing.T) {
	tests := []struct {
		name        string
		scheduledAt time.Time
		isCancelled bool
		want        string
	}{
		{"cancelled", time.Now().Add(time.Hour), true, "cancelled"},
		{"done", time.Now().Add(-time.Hour), false, "done"},
		{"pending", time.Now().Add(time.Hour), false, "pending"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := bookingStatus(tt.scheduledAt, tt.isCancelled); got != tt.want {
				t.Errorf("got %q, want %q", got, tt.want)
			}
		})
	}
}

func TestBuildBookingResponse(t *testing.T) {
	expertID := "user-expert"
	studentID := "user-student"
	users := map[string]userInfo{
		expertID:  {FirstName: "Anna", LastName: "Smith"},
		studentID: {FirstName: "Bob", LastName: "Jones"},
	}

	futureTime := time.Now().Add(24 * time.Hour).UTC().Truncate(time.Microsecond)
	createdTime := time.Now().UTC().Truncate(time.Microsecond)

	var scheduledAt pgtype.Timestamptz
	_ = scheduledAt.Scan(futureTime)
	var createdAt pgtype.Timestamptz
	_ = createdAt.Scan(createdTime)

	var groupID, sessionTypeID, id pgtype.UUID
	copy(id.Bytes[:], []byte{1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16})
	id.Valid = true
	copy(groupID.Bytes[:], []byte{17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32})
	groupID.Valid = true
	copy(sessionTypeID.Bytes[:], []byte{33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48})
	sessionTypeID.Valid = true

	t.Run("names concatenated correctly", func(t *testing.T) {
		resp := buildBookingResponse(
			id, expertID, studentID, groupID, sessionTypeID, "Quick Call",
			scheduledAt, 60, false,
			pgtype.Text{}, pgtype.Text{}, pgtype.Text{},
			createdAt, users,
		)
		if resp.ExpertName != "Anna Smith" {
			t.Errorf("ExpertName = %q, want %q", resp.ExpertName, "Anna Smith")
		}
		if resp.StudentName != "Bob Jones" {
			t.Errorf("StudentName = %q, want %q", resp.StudentName, "Bob Jones")
		}
	})

	t.Run("optional fields nil when not set", func(t *testing.T) {
		resp := buildBookingResponse(
			id, expertID, studentID, groupID, sessionTypeID, "",
			scheduledAt, 60, false,
			pgtype.Text{}, pgtype.Text{}, pgtype.Text{},
			createdAt, users,
		)
		if resp.CancellationReason != nil {
			t.Errorf("CancellationReason: want nil, got %v", resp.CancellationReason)
		}
		if resp.CancelledBy != nil {
			t.Errorf("CancelledBy: want nil, got %v", resp.CancelledBy)
		}
		if resp.Notes != nil {
			t.Errorf("Notes: want nil, got %v", resp.Notes)
		}
	})

	t.Run("optional fields populated when Valid", func(t *testing.T) {
		reason := pgtype.Text{String: "conflict", Valid: true}
		by := pgtype.Text{String: expertID, Valid: true}
		notes := pgtype.Text{String: "please confirm", Valid: true}

		resp := buildBookingResponse(
			id, expertID, studentID, groupID, sessionTypeID, "",
			scheduledAt, 60, true,
			reason, by, notes,
			createdAt, users,
		)
		if resp.CancellationReason == nil || *resp.CancellationReason != "conflict" {
			t.Errorf("CancellationReason = %v, want %q", resp.CancellationReason, "conflict")
		}
		if resp.CancelledBy == nil || *resp.CancelledBy != expertID {
			t.Errorf("CancelledBy = %v, want %q", resp.CancelledBy, expertID)
		}
		if resp.Notes == nil || *resp.Notes != "please confirm" {
			t.Errorf("Notes = %v, want %q", resp.Notes, "please confirm")
		}
		if resp.Status != "cancelled" {
			t.Errorf("Status = %q, want %q", resp.Status, "cancelled")
		}
	})
}
