import { provideHttpClient } from '@angular/common/http';
import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideAnimations } from "@angular/platform-browser/animations";
import { provideRouter } from '@angular/router';
import { NG_EVENT_PLUGINS } from "@taiga-ui/event-plugins";

import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
        provideAnimations(),
        provideBrowserGlobalErrorListeners(),
        provideHttpClient(),
        provideRouter(routes),
        NG_EVENT_PLUGINS,
    ]
};
