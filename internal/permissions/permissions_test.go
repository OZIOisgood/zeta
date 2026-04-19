package permissions

import "testing"

func TestHasPermission(t *testing.T) {
	perms := []string{"assets:create", "groups:read", "coaching:book"}

	tests := []struct {
		name       string
		permission string
		want       bool
	}{
		{"exists", "assets:create", true},
		{"exists second", "groups:read", true},
		{"missing", "admin:delete", false},
		{"empty string", "", false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := HasPermission(perms, tt.permission); got != tt.want {
				t.Errorf("HasPermission(%v, %q) = %v, want %v", perms, tt.permission, got, tt.want)
			}
		})
	}
}

func TestHasPermission_EmptySlice(t *testing.T) {
	if HasPermission(nil, "anything") {
		t.Error("expected false for nil slice")
	}
	if HasPermission([]string{}, "anything") {
		t.Error("expected false for empty slice")
	}
}
