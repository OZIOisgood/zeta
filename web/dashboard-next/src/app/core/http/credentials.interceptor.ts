import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { EnvService } from './env.service';
import { SessionRefreshService } from './session-refresh.service';

export const credentialsInterceptor: HttpInterceptorFn = (req, next) => {
  const env = inject(EnvService);
  const sessionRefresh = inject(SessionRefreshService);

  if (!env.apiUrl || !req.url.startsWith(env.apiUrl)) {
    return next(req);
  }

  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const authenticatedRequest = req.clone({
    withCredentials: true,
    setHeaders: { 'X-Timezone': timezone },
  });

  return next(authenticatedRequest).pipe(
    catchError((error: unknown) => {
      if (
        !(error instanceof HttpErrorResponse) ||
        error.status !== 401 ||
        req.url === `${env.apiUrl}/auth/refresh`
      ) {
        return throwError(() => error);
      }

      return sessionRefresh.refresh().pipe(
        switchMap(() => next(authenticatedRequest)),
        catchError((refreshOrRetryError: unknown) => throwError(() => refreshOrRetryError)),
      );
    }),
  );
};
