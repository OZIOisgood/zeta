import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideTransloco, translocoConfig } from '@jsverse/transloco';

import { DASHBOARD_LANGUAGES } from './core/i18n/dashboard-localization.service';
import { TranslocoHttpLoader } from './core/i18n/transloco-loader';
import { credentialsInterceptor } from './core/http/credentials.interceptor';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(withInterceptors([credentialsInterceptor])),
    provideRouter(routes),
    provideTransloco({
      config: translocoConfig({
        availableLangs: DASHBOARD_LANGUAGES.map((language) => language.value),
        defaultLang: 'en',
        fallbackLang: 'en',
        prodMode: false,
        reRenderOnLangChange: true,
      }),
      loader: TranslocoHttpLoader,
    }),
  ],
};
