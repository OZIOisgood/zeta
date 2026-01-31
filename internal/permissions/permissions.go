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
	VideoFinalize   = "video:finalize"
)

// Roles
const (
	RoleAdmin   = "admin"
	RoleExpert  = "expert"
	RoleStudent = "student"
)

// RolePermissions maps roles to their specific permissions
var rolePermissions = map[string][]string{
	RoleAdmin: {
		AssetsCreate,
		GroupsCreate,
		GroupsRead,
		ReviewsCreate,
		ReviewsRead,
		ReviewsEdit,
		ReviewsDelete,
		VideoFinalize,
	},
	RoleExpert: {
		GroupsCreate,
		GroupsRead,
		ReviewsCreate,
		ReviewsRead,
		ReviewsEdit,
		ReviewsDelete,
		VideoFinalize,
	},
	RoleStudent: {
		AssetsCreate,
		GroupsRead,
		ReviewsRead,
	},
}

// HasPermission checks if a given role string has the requested permission
func HasPermission(role, permission string) bool {
	perms, ok := rolePermissions[role]
	if !ok {
		return false
	}
	for _, p := range perms {
		if p == permission {
			return true
		}
	}
	return false
}
