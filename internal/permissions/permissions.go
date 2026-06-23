package permissions

// Permissions
const (
	AssetsCreate          = "assets:create"
	GroupsCreate          = "groups:create"
	GroupsRead            = "groups:read"
	ReviewsCreate         = "reviews:create"
	ReviewsRead           = "reviews:read"
	ReviewsEdit           = "reviews:edit"
	ReviewsDelete         = "reviews:delete"
	AssetsFinalize        = "assets:finalize"
	GroupsUserListRead    = "groups:user-list:read"
	GroupsExpertListRead  = "groups:expert-list:read"
	GroupsUserListDelete  = "groups:user-list:delete"
	GroupsMembershipLeave = "groups:membership:leave"
	GroupsInvitesCreate   = "groups:invites:create"
	GroupsInvitesRead     = "groups:invites:read"
	GroupsInvitesRevoke   = "groups:invites:revoke"
	GroupsPreferencesEdit = "groups:preferences:edit"
	GroupsDelete          = "groups:delete"

	CoachingAvailabilityManage = "coaching:availability:manage"
	CoachingSlotsRead          = "coaching:slots:read"
	CoachingBook               = "coaching:book"
	CoachingBookingsRead       = "coaching:bookings:read"
	CoachingBookingsManage     = "coaching:bookings:manage"
	CoachingVideoConnect       = "coaching:video:connect"

	ReportsRead = "reports:read"

	AccessInviteCodesRead = "access:invite-codes:read"

	AdminUsersRead       = "admin:users:read"
	AdminUsersRoleUpdate = "admin:users:role:update"
	AdminVideosRead      = "admin:videos:read"
	AdminSessionsRead    = "admin:sessions:read"
	AdminCodesRead       = "admin:codes:read"
	AdminCodesManage     = "admin:codes:manage"
	AdminAuditRead       = "admin:audit:read"
)

// Roles
const (
	RoleAdmin   = "admin"
	RoleExpert  = "expert"
	RoleStudent = "student"
)

// HasPermission checks if the given permissions slice contains the requested permission
func HasPermission(userPermissions []string, permission string) bool {
	for _, p := range userPermissions {
		if p == permission {
			return true
		}
	}
	return false
}
