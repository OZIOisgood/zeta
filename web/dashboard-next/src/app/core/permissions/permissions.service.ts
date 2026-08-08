import { Injectable, inject } from '@angular/core';
import { SessionStore } from '../../features/session/session.store';

export type Permission =
  | 'assets:create'
  | 'groups:create'
  | 'groups:read'
  | 'reviews:create'
  | 'reviews:reply'
  | 'reviews:reply-before-ready'
  | 'reviews:read'
  | 'reviews:edit'
  | 'reviews:delete'
  | 'assets:finalize'
  | 'groups:user-list:read'
  | 'groups:expert-list:read'
  | 'groups:user-list:delete'
  | 'groups:membership:leave'
  | 'groups:invites:create'
  | 'groups:invites:read'
  | 'groups:invites:revoke'
  | 'groups:preferences:edit'
  | 'groups:delete'
  | 'coaching:availability:manage'
  | 'coaching:slots:read'
  | 'coaching:book'
  | 'coaching:bookings:read'
  | 'coaching:bookings:manage'
  | 'coaching:video:connect'
  | 'reports:read'
  | 'moderation:reports:create'
  | 'moderation:reports:read'
  | 'moderation:reports:update';

@Injectable({ providedIn: 'root' })
export class PermissionsService {
  private readonly session = inject(SessionStore);

  hasPermission(permission: Permission): boolean {
    return this.session.hasPermission(permission);
  }
}
