package auth

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"os"

	"github.com/workos/workos-go/v4/pkg/usermanagement"
)

//go:generate mockgen -source=workos.go -destination=mocks/mock_workos.go -package=mocks

// UserManagement abstracts the WorkOS User Management API for testability.
type UserManagement interface {
	GetAuthorizationURL(opts usermanagement.GetAuthorizationURLOpts) (*url.URL, error)
	AuthenticateWithCode(ctx context.Context, opts usermanagement.AuthenticateWithCodeOpts) (usermanagement.AuthenticateResponse, error)
	AuthenticateWithRefreshToken(ctx context.Context, opts usermanagement.AuthenticateWithRefreshTokenOpts) (usermanagement.RefreshAuthenticationResponse, error)
	AuthenticateWithPassword(ctx context.Context, opts usermanagement.AuthenticateWithPasswordOpts) (usermanagement.AuthenticateResponse, error)
	GetUser(ctx context.Context, opts usermanagement.GetUserOpts) (usermanagement.User, error)
	ListUsers(ctx context.Context, opts usermanagement.ListUsersOpts) (usermanagement.ListUsersResponse, error)
	UpdateUser(ctx context.Context, opts usermanagement.UpdateUserOpts) (usermanagement.User, error)
	ListOrganizationMemberships(ctx context.Context, opts usermanagement.ListOrganizationMembershipsOpts) (usermanagement.ListOrganizationMembershipsResponse, error)
	CreateOrganizationMembership(ctx context.Context, opts usermanagement.CreateOrganizationMembershipOpts) (usermanagement.OrganizationMembership, error)
	UpdateOrganizationMembership(ctx context.Context, organizationMembershipID string, opts usermanagement.UpdateOrganizationMembershipOpts) (usermanagement.OrganizationMembership, error)
	RevokeUserSessions(ctx context.Context, userID string) error
	GetLogoutURL(opts usermanagement.GetLogoutURLOpts) (*url.URL, error)
}

// workosClient wraps the WorkOS package-level functions into an interface-satisfying struct.
type workosClient struct{}

func NewWorkOSClient() UserManagement {
	return &workosClient{}
}

func (w *workosClient) GetAuthorizationURL(opts usermanagement.GetAuthorizationURLOpts) (*url.URL, error) {
	return usermanagement.GetAuthorizationURL(opts)
}

func (w *workosClient) AuthenticateWithCode(ctx context.Context, opts usermanagement.AuthenticateWithCodeOpts) (usermanagement.AuthenticateResponse, error) {
	return usermanagement.AuthenticateWithCode(ctx, opts)
}

func (w *workosClient) AuthenticateWithRefreshToken(ctx context.Context, opts usermanagement.AuthenticateWithRefreshTokenOpts) (usermanagement.RefreshAuthenticationResponse, error) {
	return usermanagement.AuthenticateWithRefreshToken(ctx, opts)
}

func (w *workosClient) AuthenticateWithPassword(ctx context.Context, opts usermanagement.AuthenticateWithPasswordOpts) (usermanagement.AuthenticateResponse, error) {
	return usermanagement.AuthenticateWithPassword(ctx, opts)
}

func (w *workosClient) GetUser(ctx context.Context, opts usermanagement.GetUserOpts) (usermanagement.User, error) {
	return usermanagement.GetUser(ctx, opts)
}

func (w *workosClient) ListUsers(ctx context.Context, opts usermanagement.ListUsersOpts) (usermanagement.ListUsersResponse, error) {
	return usermanagement.ListUsers(ctx, opts)
}

func (w *workosClient) UpdateUser(ctx context.Context, opts usermanagement.UpdateUserOpts) (usermanagement.User, error) {
	return usermanagement.UpdateUser(ctx, opts)
}

func (w *workosClient) ListOrganizationMemberships(ctx context.Context, opts usermanagement.ListOrganizationMembershipsOpts) (usermanagement.ListOrganizationMembershipsResponse, error) {
	return usermanagement.ListOrganizationMemberships(ctx, opts)
}

func (w *workosClient) CreateOrganizationMembership(ctx context.Context, opts usermanagement.CreateOrganizationMembershipOpts) (usermanagement.OrganizationMembership, error) {
	return usermanagement.CreateOrganizationMembership(ctx, opts)
}

func (w *workosClient) UpdateOrganizationMembership(ctx context.Context, organizationMembershipID string, opts usermanagement.UpdateOrganizationMembershipOpts) (usermanagement.OrganizationMembership, error) {
	return usermanagement.UpdateOrganizationMembership(ctx, organizationMembershipID, opts)
}

func (w *workosClient) RevokeUserSessions(ctx context.Context, userID string) error {
	apiKey := os.Getenv("WORKOS_API_KEY")
	if apiKey == "" {
		return fmt.Errorf("WORKOS_API_KEY is not configured")
	}

	after := ""
	for {
		endpoint := fmt.Sprintf("https://api.workos.com/user_management/users/%s/sessions?limit=100", url.PathEscape(userID))
		if after != "" {
			endpoint += "&after=" + url.QueryEscape(after)
		}
		req, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint, nil)
		if err != nil {
			return err
		}
		req.Header.Set("Authorization", "Bearer "+apiKey)
		resp, err := http.DefaultClient.Do(req)
		if err != nil {
			return fmt.Errorf("list WorkOS sessions: %w", err)
		}
		var result struct {
			Data []struct {
				ID string `json:"id"`
			} `json:"data"`
			ListMetadata struct {
				After string `json:"after"`
			} `json:"list_metadata"`
		}
		decodeErr := json.NewDecoder(resp.Body).Decode(&result)
		resp.Body.Close()
		if resp.StatusCode < http.StatusOK || resp.StatusCode >= http.StatusMultipleChoices {
			return fmt.Errorf("list WorkOS sessions: status %d", resp.StatusCode)
		}
		if decodeErr != nil {
			return fmt.Errorf("decode WorkOS sessions: %w", decodeErr)
		}
		for _, session := range result.Data {
			if err := usermanagement.RevokeSession(ctx, usermanagement.RevokeSessionOpts{SessionID: session.ID}); err != nil {
				return fmt.Errorf("revoke WorkOS session: %w", err)
			}
		}
		if result.ListMetadata.After == "" {
			return nil
		}
		after = result.ListMetadata.After
	}
}

func (w *workosClient) GetLogoutURL(opts usermanagement.GetLogoutURLOpts) (*url.URL, error) {
	return usermanagement.GetLogoutURL(opts)
}
