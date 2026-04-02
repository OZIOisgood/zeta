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
  | 'groups:user-list:delete'
  | 'groups:invites:create'
  | 'groups:preferences:edit';

@Injectable({
  providedIn: 'root',
})
export class PermissionsService {
  private auth = inject(AuthService);

  hasPermission(permission: Permission): boolean {
    const user = this.auth.user();
    if (!user) return false;
    return user.permissions.includes(permission);
  }
}
