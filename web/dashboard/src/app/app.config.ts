import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  APP_INITIALIZER,
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { NG_EVENT_PLUGINS } from '@taiga-ui/event-plugins';

import { routes } from './app.routes';
import { credentialsInterceptor } from './shared/interceptors/credentials.interceptor';
import { AuthService } from './shared/services/auth.service';
import { EnvService } from './shared/services/env.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideAnimations(),
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(withInterceptors([credentialsInterceptor])),
    provideRouter(routes),
    NG_EVENT_PLUGINS,
    {
      provide: APP_INITIALIZER,
      useFactory: (env: EnvService, auth: AuthService) => () =>
        env.load().then(() => auth.checkSession()),
      deps: [EnvService, AuthService],
      multi: true,
    },
  ],
};
