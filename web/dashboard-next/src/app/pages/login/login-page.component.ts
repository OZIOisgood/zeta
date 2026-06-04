import { Component, inject, OnInit } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { filter, take } from 'rxjs';
import { SessionStore } from '../../features/session/session.store';
import { ZButtonComponent } from '../../shared/ui/button/z-button.component';

@Component({
  selector: 'app-login-page',
  imports: [TranslocoPipe, ZButtonComponent],
  template: `
    <div class="grid min-h-dvh place-items-center bg-[var(--z-bg)] px-4">
      <div class="w-full max-w-sm">
        <div
          class="rounded-xl border border-[var(--z-border)] bg-white p-8 shadow-sm shadow-orange-950/5"
        >
          <!-- Brand mark -->
          <div class="flex items-center gap-3">
            <img
              src="assets/brand/mark/zeta-horse-mark-orange-128.png"
              width="44"
              height="44"
              class="size-11 shrink-0 rounded-lg"
              alt=""
              aria-hidden="true"
            />
            <div>
              <p class="text-sm font-semibold">{{ 'app.brand' | transloco }}</p>
              <p class="text-xs text-[var(--z-muted)]">{{ 'app.tagline' | transloco }}</p>
            </div>
          </div>

          <!-- Heading -->
          <h1 class="mt-7 text-xl font-semibold">{{ 'auth.login.title' | transloco }}</h1>
          <p class="mt-2 text-sm leading-6 text-[var(--z-muted)]">
            {{ 'auth.login.description' | transloco }}
          </p>

          <!-- Action -->
          <div class="mt-7">
            <z-button class="w-full" (pressed)="session.login()">
              {{ 'auth.login.signIn' | transloco }}
            </z-button>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class LoginPageComponent implements OnInit {
  protected readonly session = inject(SessionStore);
  private readonly router = inject(Router);

  ngOnInit(): void {
    // If already authenticated (e.g. direct URL visit), go home.
    if (this.session.status() === 'success') {
      void this.router.navigate(['/']);
      return;
    }

    // In case the session is still loading when this page mounts, wait for it.
    if (this.session.status() === 'idle' || this.session.status() === 'loading') {
      toObservable(this.session.status)
        .pipe(
          filter((s) => s !== 'idle' && s !== 'loading'),
          take(1),
        )
        .subscribe((s) => {
          if (s === 'success') void this.router.navigate(['/']);
        });
    }
  }
}
