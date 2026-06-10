import { inject } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { CanActivateFn, Router } from '@angular/router';
import { filter, map, take } from 'rxjs';
import { SessionStore } from '../../features/session/session.store';
import { Permission, PermissionsService } from '../permissions/permissions.service';

const isSettled = (status: string) => status !== 'idle' && status !== 'loading';

export const permissionGuard: CanActivateFn = (route, state) => {
  const session = inject(SessionStore);
  const permissions = inject(PermissionsService);
  const router = inject(Router);
  const permission = route.data['permission'] as Permission | undefined;

  if (!permission) {
    return true;
  }

  const decide = () => {
    if (session.status() !== 'success') {
      session.login(state.url);
      return false;
    }

    return permissions.hasPermission(permission) || router.createUrlTree(['/']);
  };

  if (isSettled(session.status())) {
    return decide();
  }

  return toObservable(session.status).pipe(filter(isSettled), take(1), map(decide));
};
