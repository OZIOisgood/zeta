package permissions

// Permissions
const (
	AssetsCreate    = "assets:create"
	GroupsCreate    = "groups:create"
	GroupsRead      = "groups:read"
	ReviewsCreate   = "reviews:create"
	ReviewsRead     = "reviews:read"
	ReviewsEdit     = "reviews:edit"
	ReviewsDelete   = "reviews:delete"
	AssetsFinalize   = "assets:finalize"
	GroupsUserListRead    = "groups:user-list:read"
	GroupsUserListDelete  = "groups:user-list:delete"
	GroupsInvitesCreate   = "groups:invites:create"
	GroupsPreferencesEdit = "groups:preferences:edit"

	CoachingAvailabilityManage = "coaching:availability:manage"
	CoachingSlotsRead          = "coaching:slots:read"
	CoachingBook               = "coaching:book"
	CoachingBookingsRead       = "coaching:bookings:read"
	CoachingBookingsManage     = "coaching:bookings:manage"
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
