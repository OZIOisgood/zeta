import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { EnvService } from './env.service';

export const credentialsInterceptor: HttpInterceptorFn = (req, next) => {
  const env = inject(EnvService);

  if (!env.apiUrl || !req.url.startsWith(env.apiUrl)) {
    return next(req);
  }

  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  return next(
    req.clone({
      withCredentials: true,
      setHeaders: { 'X-Timezone': timezone },
    }),
  );
};
