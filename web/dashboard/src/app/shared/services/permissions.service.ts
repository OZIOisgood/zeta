import { Injectable, inject } from '@angular/core';
import { AuthService } from './auth.service';

export type Permission =
  | 'assets:create'
  | 'groups:create'
  | 'groups:read'
  | 'reviews:create'
  | 'reviews:read';

@Injectable({
  providedIn: 'root',
})
export class PermissionsService {
  private auth = inject(AuthService);

  private rolePermissions: Record<string, Permission[]> = {
    admin: ['assets:create', 'groups:create', 'groups:read', 'reviews:create', 'reviews:read'],
    expert: ['groups:create', 'groups:read', 'reviews:create', 'reviews:read'],
    student: ['assets:create', 'groups:read', 'reviews:read'],
  };

  hasPermission(permission: Permission): boolean {
    const user = this.auth.user();
    if (!user) return false;
    const perms = this.rolePermissions[user.role] || [];
    return perms.includes(permission);
  }
}
