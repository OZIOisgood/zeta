import { inject } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { CanActivateFn, Router } from '@angular/router';
import { filter, map, take } from 'rxjs';
import { SessionStore } from '../../features/session/session.store';

const isSettled = (status: string) => status !== 'idle' && status !== 'loading';

export const authGuard: CanActivateFn = () => {
  const session = inject(SessionStore);
  const router = inject(Router);

  const bounce = () => {
    session.login(router.url);
    return false;
  };

  // If already settled, resolve immediately.
  if (isSettled(session.status())) {
    return session.status() === 'success' || bounce();
  }

  // Wait for the session check to finish, then decide.
  return toObservable(session.status).pipe(
    filter(isSettled),
    take(1),
    map((s) => s === 'success' || bounce()),
  );
};
