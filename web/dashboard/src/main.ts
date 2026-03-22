import { bootstrapApplication } from '@angular/platform-browser';
import { App } from './app/core/app';
import { appConfig } from './app/core/app.config';

// Save the original path before Angular routing can redirect away from it.
// This runs synchronously before bootstrapApplication, so guards cannot interfere.
const initialPath = window.location.pathname + window.location.search;
if (initialPath !== '/') {
  localStorage.setItem(
    'zeta_redirect_after_login',
    JSON.stringify({ path: initialPath, expiresAt: Date.now() + 5 * 60 * 1000 }),
  );
}

bootstrapApplication(App, appConfig).catch((err) => console.error(err));
