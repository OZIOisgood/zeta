package invitations

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"net/mail"
	"strconv"
	"strings"
	"time"

	"github.com/OZIOisgood/zeta/internal/auth"
	"github.com/OZIOisgood/zeta/internal/db"
	"github.com/OZIOisgood/zeta/internal/email"
	"github.com/OZIOisgood/zeta/internal/i18n"
	"github.com/OZIOisgood/zeta/internal/logger"
	"github.com/OZIOisgood/zeta/internal/notifications"
	"github.com/OZIOisgood/zeta/internal/permissions"
	"github.com/OZIOisgood/zeta/internal/pgutil"
	"github.com/OZIOisgood/zeta/internal/preferences"
	"github.com/OZIOisgood/zeta/internal/tools"
	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	qrcode "github.com/skip2/go-qrcode"
	"github.com/workos/workos-go/v4/pkg/usermanagement"
)

type Handler struct {
	q                db.Querier
	email            email.Sender
	workos           auth.UserManagement
	logger           *slog.Logger
	webInviteBaseURL string
}

func NewHandler(q db.Querier, email email.Sender, workos auth.UserManagement, logger *slog.Logger, webInviteBaseURL string) *Handler {
	return &Handler{
		q:                q,
		email:            email,
		workos:           workos,
		logger:           logger,
		webInviteBaseURL: webInviteBaseURL,
	}
}

type CreateInvitationRequest struct {
	Email string `json:"email"`
}

type groupInvitationView struct {
	ID              string     `json:"id"`
	Code            string     `json:"code"`
	Delivery        string     `json:"delivery"`
	Email           *string    `json:"email,omitempty"`
	Status          string     `json:"status"`
	InviteURL       string     `json:"invite_url"`
	CreatedAt       *time.Time `json:"created_at,omitempty"`
	StatusChangedAt *time.Time `json:"status_changed_at,omitempty"`
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

	emailAddress := strings.TrimSpace(req.Email)
	invitationEmail := pgtype.Text{}
	if emailAddress != "" {
		if _, err := mail.ParseAddress(emailAddress); err != nil {
			http.Error(w, "Invalid email address", http.StatusBadRequest)
			return
		}
		invitationEmail = pgtype.Text{String: emailAddress, Valid: true}
	}

	code, err := tools.GenerateCode(8)
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
		Email:     invitationEmail,
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

	inviteLink := h.inviteURL(code)
	if emailAddress != "" {
		inviterPrefs, err := h.q.GetUserPreferences(ctx, user.ID)
		if err != nil {
			log.ErrorContext(ctx, "invitation_inviter_preferences_failed",
				slog.String("component", "invitations"),
				slog.String("user_id", user.ID),
				slog.Any("err", err),
			)
			http.Error(w, "Failed to resolve inviter profile", http.StatusInternalServerError)
			return
		}
		inviterName, err := preferences.RequireDisplayName(inviterPrefs)
		if err != nil {
			log.ErrorContext(ctx, "invitation_inviter_name_missing",
				slog.String("component", "invitations"),
				slog.String("user_id", user.ID),
				slog.Any("err", err),
			)
			http.Error(w, "Failed to resolve inviter profile", http.StatusInternalServerError)
			return
		}
		// External invitation: recipient user ID unknown — use DEFAULT_LANGUAGE.
		loc := i18n.Default()
		subject := i18n.T(loc, "email.invitation.subject")
		message := email.Message{
			Copy: email.Copy{
				Preheader:  i18n.T(loc, "email.invitation.preheader", map[string]any{"InviterName": inviterName}),
				Title:      i18n.T(loc, "email.invitation.title"),
				Intro:      i18n.T(loc, "email.invitation.intro", map[string]any{"InviterName": inviterName}),
				Button:     i18n.T(loc, "email.invitation.button"),
				FooterNote: i18n.T(loc, "email.invitation.footer"),
			},
			Action: &email.Action{URL: inviteLink},
		}

		go func(to string) {
			if err := h.email.SendTemplate([]string{to}, subject, email.TemplateNotification, message); err != nil {
				h.logger.Error("invitation_email_send_failed",
					slog.String("component", "invitations"),
					slog.Any("err", err),
				)
			} else {
				h.logger.Info("invitation_email_sent",
					slog.String("component", "invitations"),
				)
			}
		}(emailAddress)

		// In-app notification — only possible when the invited email already maps
		// to a registered user (generic link/QR invites have no known recipient).
		go func(to, inviter, inviteCode string) {
			bgCtx := context.Background()
			bgLog := h.logger.With(slog.String("component", "invitations"))

			users, err := h.workos.ListUsers(bgCtx, usermanagement.ListUsersOpts{Email: to})
			if err != nil {
				bgLog.ErrorContext(bgCtx, "invitation_notification_user_lookup_failed", slog.Any("err", err))
				return
			}
			if len(users.Data) == 0 {
				return // invitee has no account yet — email invite only
			}
			recipientID := users.Data[0].ID

			group, err := h.q.GetGroup(bgCtx, pgGroupID)
			if err != nil {
				bgLog.ErrorContext(bgCtx, "invitation_notification_group_fetch_failed", slog.Any("err", err))
				return
			}

			notifications.Record(bgCtx, h.q, h.logger, recipientID, notifications.TypeGroupInvitationReceived,
				notifications.GroupInvitationReceivedPayload{
					GroupID:     pgutil.UUIDToString(pgGroupID),
					GroupName:   group.Name,
					InviterName: strings.TrimSpace(inviter),
					Code:        inviteCode,
				})
		}(emailAddress, inviterName, code)
	}

	log.InfoContext(ctx, "invitation_created",
		slog.String("component", "invitations"),
		slog.String("user_id", user.ID),
		slog.String("group_id", groupIDStr),
		slog.String("delivery", invitationDelivery(invitationEmail)),
	)

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(h.invitationView(invitation))
}

// ListInvitations returns invitation history for a group member with explicit visibility permission.
func (h *Handler) ListInvitations(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	log := logger.From(ctx, h.logger)
	user := auth.GetUser(ctx)
	if user == nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}
	if !permissions.HasPermission(user.Permissions, permissions.GroupsInvitesRead) {
		http.Error(w, "Permission denied", http.StatusForbidden)
		return
	}

	groupID, ok := h.requireGroupMembership(w, r, user.ID)
	if !ok {
		return
	}
	invitations, err := h.q.ListGroupInvitations(ctx, groupID)
	if err != nil {
		log.ErrorContext(ctx, "invitation_list_failed",
			slog.String("component", "invitations"), slog.String("user_id", user.ID), slog.Any("err", err))
		http.Error(w, "Failed to load invitations", http.StatusInternalServerError)
		return
	}

	views := make([]groupInvitationView, 0, len(invitations))
	for _, invitation := range invitations {
		views = append(views, h.invitationView(invitation))
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]any{"invitations": views})
}

// RevokeInvitation invalidates an active group invitation.
func (h *Handler) RevokeInvitation(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	log := logger.From(ctx, h.logger)
	user := auth.GetUser(ctx)
	if user == nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}
	if !permissions.HasPermission(user.Permissions, permissions.GroupsInvitesRevoke) {
		http.Error(w, "Permission denied", http.StatusForbidden)
		return
	}

	groupID, ok := h.requireGroupMembership(w, r, user.ID)
	if !ok {
		return
	}
	invitationUUID, err := uuid.Parse(chi.URLParam(r, "invitationID"))
	if err != nil {
		http.Error(w, "Invalid invitation ID", http.StatusBadRequest)
		return
	}
	_, err = h.q.RevokeGroupInvitation(ctx, db.RevokeGroupInvitationParams{
		ID: pgtype.UUID{Bytes: invitationUUID, Valid: true}, GroupID: groupID,
	})
	if err == pgx.ErrNoRows {
		http.Error(w, "Invitation cannot be revoked", http.StatusConflict)
		return
	}
	if err != nil {
		log.ErrorContext(ctx, "invitation_revoke_failed",
			slog.String("component", "invitations"), slog.String("user_id", user.ID), slog.Any("err", err))
		http.Error(w, "Failed to revoke invitation", http.StatusInternalServerError)
		return
	}
	log.InfoContext(ctx, "invitation_revoked",
		slog.String("component", "invitations"), slog.String("user_id", user.ID),
		slog.String("group_id", pgutil.UUIDToString(groupID)))
	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) GetInvitationInfo(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	log := logger.From(ctx, h.logger)
	user := auth.GetUser(ctx)
	if user == nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	code := chi.URLParam(r, "code")
	if code == "" {
		http.Error(w, "Code is required", http.StatusBadRequest)
		return
	}
	// Normalize user-entered input to match generated (uppercase Crockford) codes.
	code = tools.NormalizeCode(code)

	invitation, err := h.q.GetGroupInvitationByCode(ctx, code)
	if err != nil {
		log.WarnContext(ctx, "invitation_info_not_found",
			slog.String("component", "invitations"),
			slog.Any("err", err),
		)
		http.Error(w, "Invitation not found", http.StatusNotFound)
		return
	}
	if invitationHasEmail(invitation) &&
		!strings.EqualFold(strings.TrimSpace(invitation.Email.String), strings.TrimSpace(user.Email)) {
		log.WarnContext(ctx, "invitation_info_recipient_mismatch",
			slog.String("component", "invitations"), slog.String("user_id", user.ID))
		http.Error(w, "Invitation not found", http.StatusNotFound)
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

	isMember, err := h.q.CheckUserGroup(ctx, db.CheckUserGroupParams{
		UserID:  user.ID,
		GroupID: invitation.GroupID,
	})
	if err != nil {
		log.ErrorContext(ctx, "invitation_info_membership_check_failed",
			slog.String("component", "invitations"),
			slog.String("user_id", user.ID),
			slog.Any("err", err),
		)
		http.Error(w, "Failed to verify group membership", http.StatusInternalServerError)
		return
	}

	if invitation.Status != db.InvitationStatusPending && !isMember {
		http.Error(w, "Invitation already used", http.StatusBadRequest)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"code":           invitation.Code,
		"group_id":       pgutil.UUIDToString(invitation.GroupID),
		"group_name":     group.Name,
		"group_avatar":   group.Avatar,
		"already_member": isMember,
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
	// Normalize user-entered input to match generated (uppercase Crockford) codes.
	code := tools.NormalizeCode(req.Code)

	invitation, err := h.q.GetGroupInvitationByCode(ctx, code)
	if err != nil {
		log.WarnContext(ctx, "invitation_accept_not_found",
			slog.String("component", "invitations"),
			slog.Any("err", err),
		)
		http.Error(w, "Invitation not found", http.StatusNotFound)
		return
	}
	if invitationHasEmail(invitation) &&
		!strings.EqualFold(strings.TrimSpace(invitation.Email.String), strings.TrimSpace(user.Email)) {
		log.WarnContext(ctx, "invitation_accept_recipient_mismatch",
			slog.String("component", "invitations"), slog.String("user_id", user.ID))
		http.Error(w, "Invitation not found", http.StatusNotFound)
		return
	}

	groupIDStr := pgutil.UUIDToString(invitation.GroupID)
	isMember, err := h.q.CheckUserGroup(ctx, db.CheckUserGroupParams{
		UserID:  user.ID,
		GroupID: invitation.GroupID,
	})
	if err != nil {
		log.ErrorContext(ctx, "invitation_accept_membership_check_failed",
			slog.String("component", "invitations"),
			slog.String("user_id", user.ID),
			slog.Any("err", err),
		)
		http.Error(w, "Failed to verify group membership", http.StatusInternalServerError)
		return
	}
	if isMember {
		log.InfoContext(ctx, "invitation_accept_already_member",
			slog.String("component", "invitations"),
			slog.String("user_id", user.ID),
			slog.String("group_id", groupIDStr),
		)

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{
			"group_id": groupIDStr,
		})
		return
	}
	if invitation.Status != db.InvitationStatusPending {
		http.Error(w, "Invitation already used", http.StatusBadRequest)
		return
	}

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

	// In-app notification for the group owner that a new member joined. Fires for
	// every join (link/QR or email invite), independent of email preferences.
	joinerName := fmt.Sprintf("%s %s", user.FirstName, user.LastName)
	go func() {
		bgCtx := context.Background()
		group, err := h.q.GetGroup(bgCtx, invitation.GroupID)
		if err != nil {
			h.logger.ErrorContext(bgCtx, "member_joined_notification_group_fetch_failed",
				slog.String("component", "invitations"),
				slog.Any("err", err),
			)
			return
		}
		if group.OwnerID == user.ID {
			return
		}
		notifications.Record(bgCtx, h.q, h.logger, group.OwnerID, notifications.TypeGroupMemberJoined,
			notifications.GroupMemberJoinedPayload{
				GroupID:    pgutil.UUIDToString(invitation.GroupID),
				GroupName:  group.Name,
				MemberName: strings.TrimSpace(joinerName),
			})
	}()

	if invitationHasEmail(invitation) {
		// Email-specific invitations are single-use. Generic link/QR invitations
		// remain pending so multiple users can join from the same shared link.
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
	}

	if invitationHasEmail(invitation) {
		// Notify inviter for direct invitations. Generic link/QR invitations may be
		// used many times, so they do not send an email on every acceptance.
		go func() {
			bgCtx := context.Background()
			bgLog := h.logger.With(
				slog.String("component", "invitations"),
				slog.String("inviter_id", invitation.InviterID),
			)

			if !preferences.AllowsUserEmail(bgCtx, h.q, h.logger, invitation.InviterID, preferences.EmailCategoryInvitationUpdates) {
				bgLog.InfoContext(bgCtx, "invitation_accepted_notification_skipped_by_preferences")
				return
			}

			inviter, err := h.workos.GetUser(bgCtx, usermanagement.GetUserOpts{
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

			joinerPrefs, err := h.q.GetUserPreferences(bgCtx, user.ID)
			if err != nil {
				bgLog.ErrorContext(bgCtx, "invitation_accepted_joiner_preferences_failed",
					slog.String("user_id", user.ID),
					slog.Any("err", err),
				)
				return
			}
			joinerName, err := preferences.RequireDisplayName(joinerPrefs)
			if err != nil {
				bgLog.ErrorContext(bgCtx, "invitation_accepted_joiner_name_missing",
					slog.String("user_id", user.ID),
					slog.Any("err", err),
				)
				return
			}
			loc := i18n.For(preferences.UserLang(bgCtx, h.q, bgLog, invitation.InviterID))
			subject := i18n.T(loc, "email.invitation_accepted.subject")
			message := email.Message{
				Copy: email.Copy{
					Preheader: i18n.T(loc, "email.invitation_accepted.preheader", map[string]any{"JoinerName": joinerName}),
					Title:     i18n.T(loc, "email.invitation_accepted.title"),
					Intro: i18n.T(loc, "email.invitation_accepted.intro", map[string]any{
						"JoinerName": joinerName,
						"GroupName":  group.Name,
					}),
				},
			}
			if err := h.email.SendTemplate([]string{inviter.Email}, subject, email.TemplateNotification, message); err != nil {
				bgLog.ErrorContext(bgCtx, "invitation_accepted_notification_send_failed",
					slog.Any("err", err),
				)
			} else {
				bgLog.InfoContext(bgCtx, "invitation_accepted_notification_sent")
			}
		}()
	}

	log.InfoContext(ctx, "invitation_accepted",
		slog.String("component", "invitations"),
		slog.String("user_id", user.ID),
		slog.String("group_id", groupIDStr),
		slog.String("invitation_code", invitation.Code),
	)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"group_id": groupIDStr,
	})
}

// DeclineInvitation lets the recipient explicitly turn down a group invitation.
// Only email-specific (single-recipient) invitations are marked declined; generic
// link/QR invitations are shared and must stay usable for others, so the caller
// just dismisses their own notification.
func (h *Handler) DeclineInvitation(w http.ResponseWriter, r *http.Request) {
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
	// Normalize user-entered input to match generated (uppercase Crockford) codes.
	code := tools.NormalizeCode(req.Code)

	invitation, err := h.q.GetGroupInvitationByCode(ctx, code)
	if err != nil {
		log.WarnContext(ctx, "invitation_decline_not_found",
			slog.String("component", "invitations"),
			slog.Any("err", err),
		)
		http.Error(w, "Invitation not found", http.StatusNotFound)
		return
	}

	if invitationHasEmail(invitation) {
		// Email-specific invitations are addressed to a single recipient. Only that
		// recipient may decline them — otherwise anyone holding the code could block
		// the real invitee. Respond 404 (not 403) so a non-recipient cannot use this
		// endpoint as an oracle to confirm a code exists.
		if !strings.EqualFold(strings.TrimSpace(invitation.Email.String), strings.TrimSpace(user.Email)) {
			log.WarnContext(ctx, "invitation_decline_recipient_mismatch",
				slog.String("component", "invitations"),
				slog.String("user_id", user.ID),
			)
			http.Error(w, "Invitation not found", http.StatusNotFound)
			return
		}
		if invitation.Status == db.InvitationStatusPending {
			if err := h.q.UpdateGroupInvitationStatus(ctx, db.UpdateGroupInvitationStatusParams{
				ID:     invitation.ID,
				Status: db.InvitationStatusDeclined,
			}); err != nil {
				log.ErrorContext(ctx, "invitation_decline_status_update_failed",
					slog.String("component", "invitations"),
					slog.String("user_id", user.ID),
					slog.Any("err", err),
				)
				http.Error(w, "Failed to decline invitation", http.StatusInternalServerError)
				return
			}
		}
	} else {
		// Generic-link/QR invitations are multi-use so their status stays pending for
		// others. Mark the user's own notification as read so the client stops showing
		// the accept/decline prompt.
		if err := h.q.MarkNotificationReadByInviteCode(ctx, db.MarkNotificationReadByInviteCodeParams{
			RecipientID: user.ID,
			Code:        []byte(code),
		}); err != nil {
			log.WarnContext(ctx, "invitation_decline_notification_dismiss_failed",
				slog.String("component", "invitations"),
				slog.String("user_id", user.ID),
				slog.Any("err", err),
			)
			// Not fatal — return 204 regardless.
		}
	}

	log.InfoContext(ctx, "invitation_declined",
		slog.String("component", "invitations"),
		slog.String("user_id", user.ID),
		slog.String("group_id", pgutil.UUIDToString(invitation.GroupID)),
		slog.String("invitation_code", invitation.Code),
	)

	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) GetInvitationQR(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	log := logger.From(ctx, h.logger)
	user := auth.GetUser(ctx)
	if user == nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}
	if !permissions.HasPermission(user.Permissions, permissions.GroupsInvitesRead) {
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
		log.ErrorContext(ctx, "invitation_qr_check_membership_failed",
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

	invitationIDStr := chi.URLParam(r, "invitationID")
	invitationID, err := uuid.Parse(invitationIDStr)
	if err != nil {
		http.Error(w, "Invalid invitation ID", http.StatusBadRequest)
		return
	}
	pgInvitationID := pgtype.UUID{Bytes: invitationID, Valid: true}

	invitation, err := h.q.GetGroupInvitationByID(ctx, db.GetGroupInvitationByIDParams{
		ID:      pgInvitationID,
		GroupID: pgGroupID,
	})
	if err != nil {
		log.WarnContext(ctx, "invitation_qr_not_found",
			slog.String("component", "invitations"),
			slog.String("invitation_id", invitationIDStr),
			slog.String("group_id", groupIDStr),
			slog.Any("err", err),
		)
		http.Error(w, "Invitation not found", http.StatusNotFound)
		return
	}

	if invitation.Status != db.InvitationStatusPending {
		http.Error(w, "Invitation already used", http.StatusBadRequest)
		return
	}

	// Parse optional size parameter
	size := 256
	if sizeParam := r.URL.Query().Get("size"); sizeParam != "" {
		if parsed, err := strconv.Atoi(sizeParam); err == nil {
			if parsed >= 128 && parsed <= 1024 {
				size = parsed
			}
		}
	}

	inviteURL := h.inviteURL(invitation.Code)

	png, err := qrcode.Encode(inviteURL, qrcode.Medium, size)
	if err != nil {
		log.ErrorContext(ctx, "invitation_qr_generation_failed",
			slog.String("component", "invitations"),
			slog.String("invitation_id", invitationIDStr),
			slog.Any("err", err),
		)
		http.Error(w, "Failed to generate QR code", http.StatusInternalServerError)
		return
	}

	log.InfoContext(ctx, "invitation_qr_generated",
		slog.String("component", "invitations"),
		slog.String("invitation_id", invitationIDStr),
		slog.String("group_id", groupIDStr),
		slog.Int("size", size),
	)

	w.Header().Set("Content-Type", "image/png")
	w.Header().Set("Cache-Control", "private, max-age=3600")
	w.Write(png)
}

func (h *Handler) inviteURL(code string) string {
	return fmt.Sprintf("%s/groups?invite=%s", h.webInviteBaseURL, code)
}

func (h *Handler) invitationView(invitation db.GroupInvitation) groupInvitationView {
	view := groupInvitationView{
		ID:              pgutil.UUIDToString(invitation.ID),
		Code:            invitation.Code,
		Delivery:        invitationDelivery(invitation.Email),
		Status:          string(invitation.Status),
		InviteURL:       h.inviteURL(invitation.Code),
		CreatedAt:       timestamptzPtr(invitation.CreatedAt),
		StatusChangedAt: timestamptzPtr(invitation.StatusChangedAt),
	}
	if invitationHasEmail(invitation) {
		email := invitation.Email.String
		view.Email = &email
	}
	return view
}

func (h *Handler) requireGroupMembership(w http.ResponseWriter, r *http.Request, userID string) (pgtype.UUID, bool) {
	groupUUID, err := uuid.Parse(chi.URLParam(r, "groupID"))
	if err != nil {
		http.Error(w, "Invalid group ID", http.StatusBadRequest)
		return pgtype.UUID{}, false
	}
	groupID := pgtype.UUID{Bytes: groupUUID, Valid: true}
	isMember, err := h.q.CheckUserGroup(r.Context(), db.CheckUserGroupParams{UserID: userID, GroupID: groupID})
	if err != nil {
		http.Error(w, "Failed to verify group membership", http.StatusInternalServerError)
		return pgtype.UUID{}, false
	}
	if !isMember {
		http.Error(w, "You are not a member of this group", http.StatusForbidden)
		return pgtype.UUID{}, false
	}
	return groupID, true
}

func timestamptzPtr(value pgtype.Timestamptz) *time.Time {
	if !value.Valid {
		return nil
	}
	return &value.Time
}

func invitationHasEmail(invitation db.GroupInvitation) bool {
	return invitation.Email.Valid && strings.TrimSpace(invitation.Email.String) != ""
}

func invitationDelivery(email pgtype.Text) string {
	if email.Valid && strings.TrimSpace(email.String) != "" {
		return "email"
	}
	return "link"
}
