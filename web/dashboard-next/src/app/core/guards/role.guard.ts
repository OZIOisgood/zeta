import { inject } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { CanActivateFn, Router } from '@angular/router';
import { filter, map, take } from 'rxjs';
import { SessionStore } from '../../features/session/session.store';

const isSettled = (status: string) => status !== 'idle' && status !== 'loading';

/** Allows the route only for users whose role is in route.data['roles']. */
export const roleGuard: CanActivateFn = (route, _state) => {
  const session = inject(SessionStore);
  const router = inject(Router);
  const roles = (route.data['roles'] as string[] | undefined) ?? [];

  const decide = () => {
    if (session.status() !== 'success') {
      return router.createUrlTree(['/']);
    }
    const role = session.user()?.role ?? '';
    return roles.includes(role) || router.createUrlTree(['/']);
  };

  if (isSettled(session.status())) {
    return decide();
  }
  return toObservable(session.status).pipe(filter(isSettled), take(1), map(decide));
};
