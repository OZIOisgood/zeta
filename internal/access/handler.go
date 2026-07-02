package access

import (
	"context"
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/OZIOisgood/zeta/internal/auth"
	"github.com/OZIOisgood/zeta/internal/db"
	"github.com/OZIOisgood/zeta/internal/logger"
	"github.com/OZIOisgood/zeta/internal/permissions"
	"github.com/OZIOisgood/zeta/internal/tools"
	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/workos/workos-go/v4/pkg/usermanagement"
)

// SessionRefresher re-issues session cookies after a role change. Satisfied by *auth.Handler.
type SessionRefresher interface {
	RefreshSessionCookies(ctx context.Context, w http.ResponseWriter, r *http.Request) error
}

type Handler struct {
	q         db.Querier
	workos    auth.UserManagement
	refresher SessionRefresher
	logger    *slog.Logger
}

func NewHandler(q db.Querier, workos auth.UserManagement, refresher SessionRefresher, logger *slog.Logger) *Handler {
	return &Handler{q: q, workos: workos, refresher: refresher, logger: logger}
}

// upgradeToExpert changes the user's default-org membership role to expert.
func (h *Handler) upgradeToExpert(ctx context.Context, userID string) error {
	orgID := os.Getenv("DEFAULT_ORG_ID")
	if orgID == "" {
		return errors.New("DEFAULT_ORG_ID is not configured")
	}
	memberships, err := h.workos.ListOrganizationMemberships(ctx, usermanagement.ListOrganizationMembershipsOpts{
		OrganizationID: orgID,
		UserID:         userID,
	})
	if err != nil {
		return err
	}
	if len(memberships.Data) == 0 {
		return errors.New("user has no default-org membership")
	}
	_, err = h.workos.UpdateOrganizationMembership(ctx, memberships.Data[0].ID, usermanagement.UpdateOrganizationMembershipOpts{
		RoleSlug: permissions.RoleExpert,
	})
	return err
}

type redeemRequest struct {
	Code string `json:"code"`
}

type redeemGroupView struct {
	ID     string  `json:"id"`
	Name   string  `json:"name"`
	Avatar *string `json:"avatar,omitempty"`
}

// Redeem activates the calling (authenticated) user via an invite code.
func (h *Handler) Redeem(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	log := logger.From(ctx, h.logger)
	user := auth.GetUser(ctx)
	if user == nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	var req redeemRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}
	if strings.TrimSpace(req.Code) == "" {
		http.Error(w, "Code is required", http.StatusBadRequest)
		return
	}
	// Normalize user-entered input to match generated (uppercase Crockford) codes.
	code := tools.NormalizeCode(req.Code)

	// Active students may still redeem an expert recommendation code. Users who
	// are already experts or admins must never consume another expert's code.
	alreadyActive := false
	if acc, err := h.q.GetUserAccess(ctx, user.ID); err == nil && acc.Status == db.AccessStatusActive {
		alreadyActive = true
		if user.Role != permissions.RoleStudent {
			writeRedeemResponse(w, db.AccessStatusActive, user.Role, false, nil)
			return
		}
	} else if err != nil && err != pgx.ErrNoRows {
		log.ErrorContext(ctx, "access_redeem_get_access_failed",
			slog.String("component", "access"), slog.String("user_id", user.ID), slog.Any("err", err))
		http.Error(w, "Failed to read access state", http.StatusInternalServerError)
		return
	}

	// 1. Expert signup code (atomic single-flight consume).
	signup, err := h.q.ConsumeSignupCode(ctx, db.ConsumeSignupCodeParams{
		Code:             code,
		RedeemedByUserID: pgtypeText(user.ID),
	})
	if err == nil {
		if upErr := h.upgradeToExpert(ctx, user.ID); upErr != nil {
			if relErr := h.q.ReleaseSignupCode(ctx, signup.ID); relErr != nil {
				log.ErrorContext(ctx, "access_redeem_release_failed",
					slog.String("component", "access"), slog.Any("err", relErr))
			}
			log.ErrorContext(ctx, "access_redeem_expert_upgrade_failed",
				slog.String("component", "access"), slog.String("user_id", user.ID), slog.Any("err", upErr))
			http.Error(w, "Failed to activate account", http.StatusInternalServerError)
			return
		}
		h.activateAndRespond(w, r, user.ID, "expert_code", permissions.RoleExpert, true, nil)
		return
	}
	if err != pgx.ErrNoRows {
		log.ErrorContext(ctx, "access_redeem_consume_failed",
			slog.String("component", "access"), slog.Any("err", err))
		http.Error(w, "Failed to redeem code", http.StatusInternalServerError)
		return
	}
	if alreadyActive {
		log.WarnContext(ctx, "access_redeem_invalid_expert_code",
			slog.String("component", "access"), slog.String("user_id", user.ID))
		http.Error(w, "Invalid or already used code", http.StatusBadRequest)
		return
	}

	// 2. Group-invite code (student path).
	if h.tryGroupRedeem(ctx, w, r, user, code) {
		return
	}

	// 3. Neutral error — no enumeration oracle.
	log.WarnContext(ctx, "access_redeem_invalid_code",
		slog.String("component", "access"), slog.String("user_id", user.ID))
	http.Error(w, "Invalid or already used code", http.StatusBadRequest)
}

// tryGroupRedeem handles the student path. Returns true if it wrote a response.
func (h *Handler) tryGroupRedeem(ctx context.Context, w http.ResponseWriter, r *http.Request, user *auth.UserContext, code string) bool {
	log := logger.From(ctx, h.logger)
	inv, err := h.q.GetGroupInvitationByCode(ctx, code)
	if err != nil {
		return false // not a group code — let the caller emit the neutral error
	}
	if invitationHasEmail(inv) && !strings.EqualFold(strings.TrimSpace(inv.Email.String), strings.TrimSpace(user.Email)) {
		return false
	}

	isMember, err := h.q.CheckUserGroup(ctx, db.CheckUserGroupParams{UserID: user.ID, GroupID: inv.GroupID})
	if err != nil {
		log.ErrorContext(ctx, "access_redeem_membership_check_failed",
			slog.String("component", "access"), slog.Any("err", err))
		http.Error(w, "Failed to verify group membership", http.StatusInternalServerError)
		return true
	}

	if !isMember {
		// Mirror invitations.AcceptInvitation: email-specific invitations are single-use,
		// so a non-pending one must not be replayable. Generic link/QR invitations carry no
		// email, stay pending, and remain multi-use.
		if inv.Status != db.InvitationStatusPending {
			return false // already used / not joinable → caller emits the neutral error
		}
		if err := h.q.AddUserToGroup(ctx, db.AddUserToGroupParams{UserID: user.ID, GroupID: inv.GroupID}); err != nil {
			log.ErrorContext(ctx, "access_redeem_add_to_group_failed",
				slog.String("component", "access"), slog.Any("err", err))
			http.Error(w, "Failed to join group", http.StatusInternalServerError)
			return true
		}
		// Email-specific invitations are single-use — mark consumed (non-fatal on error,
		// matching AcceptInvitation which logs and continues).
		if inv.Email.Valid && strings.TrimSpace(inv.Email.String) != "" {
			if err := h.q.UpdateGroupInvitationStatus(ctx, db.UpdateGroupInvitationStatusParams{
				ID:     inv.ID,
				Status: db.InvitationStatusAccepted,
			}); err != nil {
				log.ErrorContext(ctx, "access_redeem_invitation_status_update_failed",
					slog.String("component", "access"), slog.Any("err", err))
			}
		}
	}

	// Role stays student (the default). Generic codes remain multi-use.
	group, err := h.q.GetGroup(ctx, inv.GroupID)
	if err != nil {
		log.ErrorContext(ctx, "access_redeem_group_fetch_failed",
			slog.String("component", "access"), slog.Any("err", err))
		http.Error(w, "Failed to load group", http.StatusInternalServerError)
		return true
	}
	groupView := redeemGroupView{ID: uuid.UUID(inv.GroupID.Bytes).String(), Name: group.Name}
	if strings.TrimSpace(group.Avatar) != "" {
		groupView.Avatar = &group.Avatar
	}
	h.activateAndRespond(w, r, user.ID, "group_code", user.Role, false, &groupView)
	return true
}

// activateAndRespond flips the user to active, refreshes cookies (best-effort), and responds.
func (h *Handler) activateAndRespond(w http.ResponseWriter, r *http.Request, userID, via, role string, roleUpgraded bool, group *redeemGroupView) {
	ctx := r.Context()
	log := logger.From(ctx, h.logger)
	if _, err := h.q.ActivateUserAccess(ctx, db.ActivateUserAccessParams{
		UserID:       userID,
		ActivatedVia: pgtypeText(via),
	}); err != nil {
		log.ErrorContext(ctx, "access_activate_failed",
			slog.String("component", "access"), slog.String("user_id", userID), slog.String("via", via), slog.Any("err", err))
		http.Error(w, "Failed to activate account", http.StatusInternalServerError)
		return
	}
	if roleUpgraded {
		if err := h.refresher.RefreshSessionCookies(ctx, w, r); err != nil {
			log.WarnContext(ctx, "access_session_refresh_failed",
				slog.String("component", "access"), slog.Any("err", err))
		}
	}
	log.InfoContext(ctx, "access_redeemed",
		slog.String("component", "access"), slog.String("user_id", userID), slog.String("via", via))
	writeRedeemResponse(w, db.AccessStatusActive, role, roleUpgraded, group)
}

func writeRedeemResponse(w http.ResponseWriter, status db.AccessStatus, role string, roleUpgraded bool, group *redeemGroupView) {
	w.Header().Set("Content-Type", "application/json")
	response := map[string]any{
		"access_status": string(status),
		"role":          role,
		"role_upgraded": roleUpgraded,
	}
	if group != nil {
		response["group"] = group
	}
	json.NewEncoder(w).Encode(response)
}

func pgtypeText(s string) pgtype.Text {
	return pgtype.Text{String: s, Valid: s != ""}
}

type signupCodeView struct {
	ID         string     `json:"id"`
	Code       string     `json:"code"`
	Status     string     `json:"status"`
	ConsumedAt *time.Time `json:"consumed_at,omitempty"`
}

// ListCodes ensures and returns the caller's fixed expert referral allotment.
func (h *Handler) ListCodes(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	log := logger.From(ctx, h.logger)
	user := auth.GetUser(ctx)
	if user == nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}
	if !permissions.HasPermission(user.Permissions, permissions.AccessInviteCodesRead) {
		http.Error(w, "Permission denied", http.StatusForbidden)
		return
	}

	codes, err := h.q.ListSignupCodesByOwner(ctx, user.ID)
	if err != nil {
		log.ErrorContext(ctx, "access_codes_list_failed", slog.String("component", "access"), slog.Any("err", err))
		http.Error(w, "Failed to load codes", http.StatusInternalServerError)
		return
	}
	minted := 0
	for len(codes)+minted < ExpertCodeAllotment {
		_, err := h.mintCode(ctx, user.ID)
		if err == pgx.ErrNoRows {
			break
		}
		if err != nil {
			log.ErrorContext(ctx, "access_codes_ensure_failed", slog.String("component", "access"), slog.Any("err", err))
			http.Error(w, "Failed to load codes", http.StatusInternalServerError)
			return
		}
		minted++
	}
	if minted > 0 {
		codes, err = h.q.ListSignupCodesByOwner(ctx, user.ID)
		if err != nil {
			log.ErrorContext(ctx, "access_codes_reload_failed", slog.String("component", "access"), slog.Any("err", err))
			http.Error(w, "Failed to load codes", http.StatusInternalServerError)
			return
		}
		log.InfoContext(ctx, "access_codes_ensured",
			slog.String("component", "access"), slog.String("user_id", user.ID), slog.Int("created_count", minted))
	}
	views := make([]signupCodeView, 0, len(codes))
	used := 0
	for _, c := range codes {
		if c.Status == db.SignupCodeStatusConsumed {
			used++
		}
		views = append(views, signupCodeView{
			ID: uuid.UUID(c.ID.Bytes).String(), Code: c.Code, Status: string(c.Status),
			ConsumedAt: timePtr(c.ConsumedAt),
		})
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]any{
		"codes": views, "successful_referrals": used,
		"referral_limit": ExpertCodeAllotment, "remaining_referrals": max(0, ExpertCodeAllotment-used),
	})
}

func (h *Handler) mintCode(ctx context.Context, ownerID string) (db.SignupCode, error) {
	for i := 0; i < 3; i++ {
		code, err := tools.GenerateCode(signupCodeLength)
		if err != nil {
			return db.SignupCode{}, err
		}
		created, err := h.q.CreateSignupCodeWithinLimit(ctx, db.CreateSignupCodeWithinLimitParams{
			Code: code, OwnerID: ownerID, CodeLimit: ExpertCodeAllotment,
		})
		if err == nil || err == pgx.ErrNoRows {
			return created, err
		}
		var pgErr *pgconn.PgError
		if !errors.As(err, &pgErr) || pgErr.Code != "23505" {
			return db.SignupCode{}, err
		}
	}
	return db.SignupCode{}, errors.New("failed to generate unique signup code")
}

// PreviewGroupInvitation returns safe context for a waitlisted user's confirmation screen.
func (h *Handler) PreviewGroupInvitation(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	user := auth.GetUser(ctx)
	code := tools.NormalizeCode(chi.URLParam(r, "code"))
	if user == nil || code == "" {
		http.Error(w, "Invitation not found", http.StatusNotFound)
		return
	}
	inv, err := h.q.GetGroupInvitationByCode(ctx, code)
	if err != nil || inv.Status != db.InvitationStatusPending ||
		(invitationHasEmail(inv) && !strings.EqualFold(strings.TrimSpace(inv.Email.String), strings.TrimSpace(user.Email))) {
		http.Error(w, "Invitation not found", http.StatusNotFound)
		return
	}
	group, err := h.q.GetGroup(ctx, inv.GroupID)
	if err != nil {
		http.Error(w, "Invitation not found", http.StatusNotFound)
		return
	}
	isMember, err := h.q.CheckUserGroup(ctx, db.CheckUserGroupParams{UserID: user.ID, GroupID: inv.GroupID})
	if err != nil {
		http.Error(w, "Failed to preview invitation", http.StatusInternalServerError)
		return
	}
	view := redeemGroupView{ID: uuid.UUID(inv.GroupID.Bytes).String(), Name: group.Name}
	if strings.TrimSpace(group.Avatar) != "" {
		view.Avatar = &group.Avatar
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]any{"code": code, "group": view, "already_member": isMember})
}

func invitationHasEmail(inv db.GroupInvitation) bool {
	return inv.Email.Valid && strings.TrimSpace(inv.Email.String) != ""
}

func timePtr(value pgtype.Timestamptz) *time.Time {
	if !value.Valid {
		return nil
	}
	return &value.Time
}

// RequireActiveAccess blocks waitlisted users from protected feature routes.
// Admins always pass. Apply to the feature-route group, NOT to /access/redeem.
func (h *Handler) RequireActiveAccess(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()
		user := auth.GetUser(ctx)
		if user == nil {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}
		if user.Role == permissions.RoleAdmin {
			next.ServeHTTP(w, r)
			return
		}
		acc, err := h.q.GetUserAccess(ctx, user.ID)
		if err != nil || acc.Status != db.AccessStatusActive {
			if err != nil && err != pgx.ErrNoRows {
				logger.From(ctx, h.logger).ErrorContext(ctx, "access_gate_lookup_failed",
					slog.String("component", "access"), slog.Any("err", err))
			}
			http.Error(w, "Account not yet activated", http.StatusForbidden)
			return
		}
		next.ServeHTTP(w, r)
	})
}
