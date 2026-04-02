package invitations

import (
	"context"
	"crypto/rand"
	"encoding/json"
	"fmt"
	"log/slog"
	"math/big"
	"net/http"

	"github.com/OZIOisgood/zeta/internal/auth"
	"github.com/OZIOisgood/zeta/internal/db"
	"github.com/OZIOisgood/zeta/internal/email"
	"github.com/OZIOisgood/zeta/internal/logger"
	"github.com/OZIOisgood/zeta/internal/permissions"
	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/workos/workos-go/v4/pkg/usermanagement"
)

type Handler struct {
	q      *db.Queries
	email  *email.Service
	logger *slog.Logger
}

func NewHandler(q *db.Queries, email *email.Service, logger *slog.Logger) *Handler {
	return &Handler{
		q:      q,
		email:  email,
		logger: logger,
	}
}

type CreateInvitationRequest struct {
	Email string `json:"email"`
}

func (h *Handler) CreateInvitation(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	log := logger.From(ctx, h.logger)
	user := auth.GetUser(ctx)
	if user == nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	if !permissions.HasPermission(user.Permissions, permissions.GroupsInvitesCreate) {
		log.WarnContext(ctx, "invitation_create_permission_denied",
			slog.String("component", "invitations"),
			slog.String("user_id", user.ID),
			slog.String("role", user.Role),
		)
		http.Error(w, "Permission denied", http.StatusForbidden)
		return
	}

	groupIDStr := chi.URLParam(r, "groupID")
	groupID, err := uuid.Parse(groupIDStr)
	if err != nil {
		http.Error(w, "Invalid group ID", http.StatusBadRequest)
		return
	}

	pgGroupID := pgtype.UUID{Bytes: groupID, Valid: true}

	// Verify user is a member of the group
	isMember, err := h.q.CheckUserGroup(ctx, db.CheckUserGroupParams{
		UserID:  user.ID,
		GroupID: pgGroupID,
	})
	if err != nil {
		log.ErrorContext(ctx, "invitation_check_membership_failed",
			slog.String("component", "invitations"),
			slog.String("user_id", user.ID),
			slog.String("group_id", groupIDStr),
			slog.Any("err", err),
		)
		http.Error(w, "Failed to verify group membership", http.StatusInternalServerError)
		return
	}
	if !isMember {
		http.Error(w, "You are not a member of this group", http.StatusForbidden)
		return
	}

	var req CreateInvitationRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.Email == "" {
		http.Error(w, "Email is required", http.StatusBadRequest)
		return
	}

	code, err := generateCode(6)
	if err != nil {
		log.ErrorContext(ctx, "invitation_code_generation_failed",
			slog.String("component", "invitations"),
			slog.Any("err", err),
		)
		http.Error(w, "Failed to generate invitation code", http.StatusInternalServerError)
		return
	}

	invitation, err := h.q.CreateGroupInvitation(ctx, db.CreateGroupInvitationParams{
		GroupID:   pgGroupID,
		InviterID: user.ID,
		Email:     req.Email,
		Code:      code,
	})
	if err != nil {
		log.ErrorContext(ctx, "invitation_create_failed",
			slog.String("component", "invitations"),
			slog.String("user_id", user.ID),
			slog.String("group_id", groupIDStr),
			slog.Any("err", err),
		)
		http.Error(w, "Failed to create invitation", http.StatusInternalServerError)
		return
	}

	// Send invitation email
	inviteLink := fmt.Sprintf("http://localhost:4200/groups?invite=%s", code)
	inviterName := fmt.Sprintf("%s %s", user.FirstName, user.LastName)
	subject := "You've been invited to join a group on Zeta"
	text := fmt.Sprintf("%s has invited you to join a group.\n\nClick the link below to accept:\n%s", inviterName, inviteLink)

	go func() {
		if err := h.email.Send([]string{req.Email}, subject, text); err != nil {
			h.logger.Error("invitation_email_send_failed",
				slog.String("component", "invitations"),
				slog.String("email", req.Email),
				slog.Any("err", err),
			)
		} else {
			h.logger.Info("invitation_email_sent",
				slog.String("component", "invitations"),
				slog.String("email", req.Email),
				slog.String("code", code),
			)
		}
	}()

	log.InfoContext(ctx, "invitation_created",
		slog.String("component", "invitations"),
		slog.String("user_id", user.ID),
		slog.String("group_id", groupIDStr),
		slog.String("invitee_email", req.Email),
	)

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"id":   invitation.ID,
		"code": invitation.Code,
	})
}

func (h *Handler) GetInvitationInfo(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	log := logger.From(ctx, h.logger)

	code := chi.URLParam(r, "code")
	if code == "" {
		http.Error(w, "Code is required", http.StatusBadRequest)
		return
	}

	invitation, err := h.q.GetGroupInvitationByCode(ctx, code)
	if err != nil {
		log.WarnContext(ctx, "invitation_info_not_found",
			slog.String("component", "invitations"),
			slog.String("code", code),
			slog.Any("err", err),
		)
		http.Error(w, "Invitation not found", http.StatusNotFound)
		return
	}

	if invitation.Status != db.InvitationStatusPending {
		http.Error(w, "Invitation already used", http.StatusBadRequest)
		return
	}

	group, err := h.q.GetGroup(ctx, invitation.GroupID)
	if err != nil {
		log.ErrorContext(ctx, "invitation_info_group_fetch_failed",
			slog.String("component", "invitations"),
			slog.Any("err", err),
		)
		http.Error(w, "Group not found", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"code":         invitation.Code,
		"group_name":   group.Name,
		"group_avatar": group.Avatar,
	})
}

func (h *Handler) AcceptInvitation(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	log := logger.From(ctx, h.logger)
	user := auth.GetUser(ctx)
	if user == nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	var req struct {
		Code string `json:"code"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.Code == "" {
		http.Error(w, "Code is required", http.StatusBadRequest)
		return
	}

	invitation, err := h.q.GetGroupInvitationByCode(ctx, req.Code)
	if err != nil {
		log.WarnContext(ctx, "invitation_accept_not_found",
			slog.String("component", "invitations"),
			slog.String("code", req.Code),
			slog.Any("err", err),
		)
		http.Error(w, "Invitation not found", http.StatusNotFound)
		return
	}

	if invitation.Status != db.InvitationStatusPending {
		http.Error(w, "Invitation already used", http.StatusBadRequest)
		return
	}

	// Add user to group
	err = h.q.AddUserToGroup(ctx, db.AddUserToGroupParams{
		UserID:  user.ID,
		GroupID: invitation.GroupID,
	})
	if err != nil {
		log.ErrorContext(ctx, "invitation_add_user_failed",
			slog.String("component", "invitations"),
			slog.String("user_id", user.ID),
			slog.Any("err", err),
		)
		http.Error(w, "Failed to add user to group", http.StatusInternalServerError)
		return
	}

	// Mark invitation as accepted
	err = h.q.UpdateGroupInvitationStatus(ctx, db.UpdateGroupInvitationStatusParams{
		ID:     invitation.ID,
		Status: db.InvitationStatusAccepted,
	})
	if err != nil {
		log.ErrorContext(ctx, "invitation_status_update_failed",
			slog.String("component", "invitations"),
			slog.Any("err", err),
		)
	}

	// Get group ID for redirect
	groupIDBytes := invitation.GroupID.Bytes
	groupIDStr := fmt.Sprintf("%x-%x-%x-%x-%x", groupIDBytes[0:4], groupIDBytes[4:6], groupIDBytes[6:8], groupIDBytes[8:10], groupIDBytes[10:16])

	// Notify inviter that their invitation was accepted
	go func() {
		bgCtx := context.Background()
		bgLog := h.logger.With(
			slog.String("component", "invitations"),
			slog.String("inviter_id", invitation.InviterID),
		)

		inviter, err := usermanagement.GetUser(bgCtx, usermanagement.GetUserOpts{
			User: invitation.InviterID,
		})
		if err != nil {
			bgLog.ErrorContext(bgCtx, "invitation_accepted_inviter_fetch_failed",
				slog.Any("err", err),
			)
			return
		}

		if inviter.Email == "" {
			bgLog.WarnContext(bgCtx, "invitation_accepted_inviter_no_email")
			return
		}

		group, err := h.q.GetGroup(bgCtx, invitation.GroupID)
		if err != nil {
			bgLog.ErrorContext(bgCtx, "invitation_accepted_group_fetch_failed",
				slog.Any("err", err),
			)
			return
		}

		joinerName := fmt.Sprintf("%s %s", user.FirstName, user.LastName)
		subject := "Your invitation was accepted"
		text := fmt.Sprintf("%s accepted your invitation and joined the group '%s'.", joinerName, group.Name)
		if err := h.email.Send([]string{inviter.Email}, subject, text); err != nil {
			bgLog.ErrorContext(bgCtx, "invitation_accepted_notification_send_failed",
				slog.Any("err", err),
			)
		} else {
			bgLog.InfoContext(bgCtx, "invitation_accepted_notification_sent")
		}
	}()

	log.InfoContext(ctx, "invitation_accepted",
		slog.String("component", "invitations"),
		slog.String("user_id", user.ID),
		slog.String("group_id", groupIDStr),
	)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"group_id": groupIDStr,
	})
}

const codeAlphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"

func generateCode(length int) (string, error) {
	b := make([]byte, length)
	for i := range b {
		idx, err := rand.Int(rand.Reader, big.NewInt(int64(len(codeAlphabet))))
		if err != nil {
			return "", err
		}
		b[i] = codeAlphabet[idx.Int64()]
	}
	return string(b), nil
}
