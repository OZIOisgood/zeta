import { Injectable, inject } from '@angular/core';
import { AuthService } from './auth.service';

export type Permission =
  | 'assets:create'
  | 'groups:create'
  | 'groups:read'
  | 'reviews:create'
  | 'reviews:read'
  | 'reviews:edit'
  | 'reviews:delete'
  | 'assets:finalize'
  | 'groups:user-list:read'
  | 'groups:invites:create';

@Injectable({
  providedIn: 'root',
})
export class PermissionsService {
  private auth = inject(AuthService);

  private rolePermissions: Record<string, Permission[]> = {
    admin: [
      'assets:create',
      'groups:create',
      'groups:read',
      'reviews:create',
      'reviews:read',
      'reviews:edit',
      'reviews:delete',
      'assets:finalize',
      'groups:user-list:read',
      'groups:invites:create',
    ],
    expert: [
      'groups:create',
      'groups:read',
      'reviews:create',
      'reviews:read',
      'reviews:edit',
      'reviews:delete',
      'assets:finalize',
      'groups:user-list:read',
      'groups:invites:create',
    ],
    student: ['assets:create', 'groups:read', 'reviews:read'],
  };

  hasPermission(permission: Permission): boolean {
    const user = this.auth.user();
    if (!user) return false;
    const perms = this.rolePermissions[user.role] || [];
    return perms.includes(permission);
  }
}
