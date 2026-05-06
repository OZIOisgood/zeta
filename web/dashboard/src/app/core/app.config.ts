import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { ApplicationConfig, inject, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { TUI_IS_MOBILE } from '@taiga-ui/cdk';
import { TUI_ALERT_POSITION } from '@taiga-ui/core';
import { NG_EVENT_PLUGINS } from '@taiga-ui/event-plugins';

import { credentialsInterceptor } from '../shared/interceptors/credentials.interceptor';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideAnimations(),
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(withInterceptors([credentialsInterceptor])),
    provideRouter(routes),
    {
      provide: TUI_ALERT_POSITION,
      useFactory: () =>
        inject(TUI_IS_MOBILE) ? 'auto 1rem 1rem auto' : 'auto 3rem 2rem auto',
    },
    NG_EVENT_PLUGINS,
  ],
};
