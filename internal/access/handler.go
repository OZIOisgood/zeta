package access

import (
	"context"
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"os"
	"strings"

	"github.com/OZIOisgood/zeta/internal/auth"
	"github.com/OZIOisgood/zeta/internal/db"
	"github.com/OZIOisgood/zeta/internal/logger"
	"github.com/OZIOisgood/zeta/internal/permissions"
	"github.com/jackc/pgx/v5"
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
	code := strings.TrimSpace(req.Code)
	if code == "" {
		http.Error(w, "Code is required", http.StatusBadRequest)
		return
	}

	// Idempotent: an already-active user does not consume a fresh code.
	if acc, err := h.q.GetUserAccess(ctx, user.ID); err == nil && acc.Status == db.AccessStatusActive {
		writeRedeemResponse(w, db.AccessStatusActive, user.Role, false)
		return
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
		h.activateAndRespond(w, r, user.ID, "expert_code", permissions.RoleExpert, true)
		return
	}
	if err != pgx.ErrNoRows {
		log.ErrorContext(ctx, "access_redeem_consume_failed",
			slog.String("component", "access"), slog.Any("err", err))
		http.Error(w, "Failed to redeem code", http.StatusInternalServerError)
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

	isMember, err := h.q.CheckUserGroup(ctx, db.CheckUserGroupParams{UserID: user.ID, GroupID: inv.GroupID})
	if err != nil {
		log.ErrorContext(ctx, "access_redeem_membership_check_failed",
			slog.String("component", "access"), slog.Any("err", err))
		http.Error(w, "Failed to verify group membership", http.StatusInternalServerError)
		return true
	}
	if !isMember {
		if err := h.q.AddUserToGroup(ctx, db.AddUserToGroupParams{UserID: user.ID, GroupID: inv.GroupID}); err != nil {
			log.ErrorContext(ctx, "access_redeem_add_to_group_failed",
				slog.String("component", "access"), slog.Any("err", err))
			http.Error(w, "Failed to join group", http.StatusInternalServerError)
			return true
		}
	}
	// Group-invite codes stay multi-use (not consumed). Role stays student.
	h.activateAndRespond(w, r, user.ID, "group_code", user.Role, false)
	return true
}

// activateAndRespond flips the user to active, refreshes cookies (best-effort), and responds.
func (h *Handler) activateAndRespond(w http.ResponseWriter, r *http.Request, userID, via, role string, roleUpgraded bool) {
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
	writeRedeemResponse(w, db.AccessStatusActive, role, roleUpgraded)
}

func writeRedeemResponse(w http.ResponseWriter, status db.AccessStatus, role string, roleUpgraded bool) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]any{
		"access_status": string(status),
		"role":          role,
		"role_upgraded": roleUpgraded,
	})
}

func pgtypeText(s string) pgtype.Text {
	return pgtype.Text{String: s, Valid: s != ""}
}

type signupCodeView struct {
	Code   string `json:"code"`
	Status string `json:"status"`
}

// ListCodes returns the caller's signup codes. Experts get a lazily-created
// allotment of ExpertCodeAllotment on first call.
func (h *Handler) ListCodes(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	log := logger.From(ctx, h.logger)
	user := auth.GetUser(ctx)
	if user == nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}
	if user.Role != permissions.RoleExpert && user.Role != permissions.RoleAdmin {
		http.Error(w, "Permission denied", http.StatusForbidden)
		return
	}

	if user.Role == permissions.RoleExpert {
		count, err := h.q.CountSignupCodesByOwner(ctx, user.ID)
		if err != nil {
			log.ErrorContext(ctx, "access_codes_count_failed", slog.String("component", "access"), slog.Any("err", err))
			http.Error(w, "Failed to load codes", http.StatusInternalServerError)
			return
		}
		for i := count; i < ExpertCodeAllotment; i++ {
			if err := h.mintCode(ctx, user.ID); err != nil {
				log.ErrorContext(ctx, "access_codes_seed_failed", slog.String("component", "access"), slog.Any("err", err))
				http.Error(w, "Failed to create codes", http.StatusInternalServerError)
				return
			}
		}
	}

	codes, err := h.q.ListSignupCodesByOwner(ctx, user.ID)
	if err != nil {
		log.ErrorContext(ctx, "access_codes_list_failed", slog.String("component", "access"), slog.Any("err", err))
		http.Error(w, "Failed to load codes", http.StatusInternalServerError)
		return
	}
	views := make([]signupCodeView, 0, len(codes))
	for _, c := range codes {
		views = append(views, signupCodeView{Code: c.Code, Status: string(c.Status)})
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]any{"codes": views})
}

// GenerateCodes mints additional expert codes. Admin only, no cap.
func (h *Handler) GenerateCodes(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	log := logger.From(ctx, h.logger)
	user := auth.GetUser(ctx)
	if user == nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}
	if user.Role != permissions.RoleAdmin {
		http.Error(w, "Permission denied", http.StatusForbidden)
		return
	}
	var req struct {
		Count int `json:"count"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.Count < 1 || req.Count > 100 {
		http.Error(w, "Invalid count (1-100)", http.StatusBadRequest)
		return
	}
	for i := 0; i < req.Count; i++ {
		if err := h.mintCode(ctx, user.ID); err != nil {
			log.ErrorContext(ctx, "access_codes_generate_failed", slog.String("component", "access"), slog.Any("err", err))
			http.Error(w, "Failed to generate codes", http.StatusInternalServerError)
			return
		}
	}
	log.InfoContext(ctx, "access_codes_generated",
		slog.String("component", "access"), slog.String("user_id", user.ID), slog.Int("count", req.Count))
	w.WriteHeader(http.StatusCreated)
}

func (h *Handler) mintCode(ctx context.Context, ownerID string) error {
	code, err := generateCode(signupCodeLength)
	if err != nil {
		return err
	}
	_, err = h.q.CreateSignupCode(ctx, db.CreateSignupCodeParams{Code: code, OwnerUserID: ownerID})
	return err
}
