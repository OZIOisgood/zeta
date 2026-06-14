import { inject } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { CanActivateFn, Router } from '@angular/router';
import { filter, map, take } from 'rxjs';
import { SessionStore } from '../../features/session/session.store';

const isSettled = (status: string) => status !== 'idle' && status !== 'loading';

/** Requires an authenticated, ACTIVE user. Waitlisted users are sent to /welcome. */
export const accessActiveGuard: CanActivateFn = (_route, state) => {
  const session = inject(SessionStore);
  const router = inject(Router);

  const decide = () => {
    if (session.status() !== 'success') {
      session.login(state.url);
      return false;
    }
    if (session.user()?.access_status === 'active') {
      return true;
    }
    const tree = router.parseUrl(state.url);
    const code = tree.queryParams['invite'] ?? tree.queryParams['code'];
    return router.createUrlTree(['/welcome'], code ? { queryParams: { code } } : {});
  };

  if (isSettled(session.status())) {
    return decide();
  }
  return toObservable(session.status).pipe(filter(isSettled), take(1), map(decide));
};

/** Keeps already-active users out of /welcome (sends them to the app root). */
export const waitlistedOnlyGuard: CanActivateFn = () => {
  const session = inject(SessionStore);
  const router = inject(Router);

  const decide = () =>
    session.user()?.access_status === 'active' ? router.createUrlTree(['/']) : true;

  if (isSettled(session.status())) {
    return decide();
  }
  return toObservable(session.status).pipe(filter(isSettled), take(1), map(decide));
};
