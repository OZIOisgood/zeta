import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { EnvService } from '../services/env.service';

export const credentialsInterceptor: HttpInterceptorFn = (req, next) => {
  const env = inject(EnvService);
  if (req.url.startsWith(env.apiUrl)) {
    const authReq = req.clone({
      withCredentials: true,
    });
    return next(authReq);
  }
  return next(req);
};
