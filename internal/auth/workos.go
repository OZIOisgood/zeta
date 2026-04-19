package auth

import (
	"context"
	"net/url"

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
	UpdateUser(ctx context.Context, opts usermanagement.UpdateUserOpts) (usermanagement.User, error)
	ListOrganizationMemberships(ctx context.Context, opts usermanagement.ListOrganizationMembershipsOpts) (usermanagement.ListOrganizationMembershipsResponse, error)
	CreateOrganizationMembership(ctx context.Context, opts usermanagement.CreateOrganizationMembershipOpts) (usermanagement.OrganizationMembership, error)
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

func (w *workosClient) UpdateUser(ctx context.Context, opts usermanagement.UpdateUserOpts) (usermanagement.User, error) {
	return usermanagement.UpdateUser(ctx, opts)
}

func (w *workosClient) ListOrganizationMemberships(ctx context.Context, opts usermanagement.ListOrganizationMembershipsOpts) (usermanagement.ListOrganizationMembershipsResponse, error) {
	return usermanagement.ListOrganizationMemberships(ctx, opts)
}

func (w *workosClient) CreateOrganizationMembership(ctx context.Context, opts usermanagement.CreateOrganizationMembershipOpts) (usermanagement.OrganizationMembership, error) {
	return usermanagement.CreateOrganizationMembership(ctx, opts)
}

func (w *workosClient) GetLogoutURL(opts usermanagement.GetLogoutURLOpts) (*url.URL, error) {
	return usermanagement.GetLogoutURL(opts)
}
