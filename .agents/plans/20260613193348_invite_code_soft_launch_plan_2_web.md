# Invite-Code Soft Launch — Plan 2: Web Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the Clubhouse-style access gate to the Angular dashboard: route waitlisted users to a `/welcome` code-redeem screen, and give experts/admins a page to view (and, for admins, mint) invite codes.

**Architecture:** Consumes the Plan 1 backend (`/auth/me.access_status`, `POST /access/redeem`, `GET/POST /access/codes`). A new `accessActiveGuard` redirects waitlisted users to a top-level `/welcome` route (outside the `ShellComponent`, reachable while waitlisted). The redeem + codes calls go through a new `AccessApiClient` orchestrated by a new `AccessStore` (NgRx Signal Store). The codes page is a Shell child gated by access + role.

**Tech Stack:** Angular 21 standalone + signals, NgRx Signal Store, ng-primitives `z-*` components, Transloco i18n, Tailwind v4 tokens, `@lucide/angular`, Vitest.

**Spec:** `.agents/plans/20260613181444_invite_code_soft_launch_design.md`
**Depends on:** Plan 1 (backend) — merged or on this branch. **Scope:** Web only (mobile is Plan 3 / PR #15).

**Working dir:** all paths are under `web/dashboard-next/`. Run commands from repo root via WSL: `wsl.exe -d ubuntu bash -lc 'cd ~/dev/projects/zeta/.claude/worktrees/invite-code-soft-launch && <cmd>'`. Verify with `make web-next:lint`, `make web-next:build`, `make web-next:test` (if `make` lacks tooling on PATH, use `pnpm -C web/dashboard-next lint|build|test`). Read `web/dashboard-next/CLAUDE.md` before any UI work. Commit in the worktree; do not push. No `Co-Authored-By` trailer.

---

## File Structure

| File | Responsibility | Action |
| --- | --- | --- |
| `src/app/core/http/auth-api.service.ts` | add `access_status` to `User` type | Modify |
| `src/app/core/http/access-api.service.ts` | redeem + list/generate codes HTTP client | Create |
| `src/app/features/access/access.store.ts` | redeem + codes state (NgRx Signal Store) | Create |
| `src/app/core/guards/access-active.guard.ts` | gate Shell on `active`; redirect waitlisted → `/welcome` | Create |
| `src/app/core/guards/role.guard.ts` | gate a route by `data.roles` | Create |
| `src/app/pages/welcome/welcome-page.component.ts` | the code-redeem (waitlist) screen | Create |
| `src/app/pages/invite-codes/invite-codes-page.component.ts` | expert/admin codes page | Create |
| `src/app/app.routes.ts` | add `/welcome` (top-level) + `/invite-codes` (Shell child); gate Shell | Modify |
| `src/app/core/state/app-shell.store.ts` | add `invite-codes` nav item + icon union | Modify |
| `src/app/core/shell/shell.component.ts` | nav filter (expert/admin) + lucide icon import | Modify |
| `src/app/core/shell/shell.html` | render the new nav icon (two `@switch` blocks) | Modify |
| `public/i18n/{en,de,fr}.json` | new `access` i18n block | Modify |

---

## Task 1: Add `access_status` to the User model

**Files:** Modify `src/app/core/http/auth-api.service.ts`; Test `src/app/core/http/auth-api.service.spec.ts` (exists).

- [ ] **Step 1: Extend the `User` type.** In `auth-api.service.ts`, add the field to the `User` type (after `permissions`):
```ts
  permissions: string[];
  access_status: string;
```

- [ ] **Step 2: Verify the build typechecks.**
Run: `pnpm -C web/dashboard-next exec tsc -p tsconfig.app.json --noEmit` (or `make web-next:build`).
Expected: no type errors. (`access_status` is a plain string mirroring the backend `/auth/me` field; values `"waitlisted"` | `"active"`.)

- [ ] **Step 3: Commit.**
```bash
git add web/dashboard-next/src/app/core/http/auth-api.service.ts
git commit -m "feat(web): add access_status to User model"
```

---

## Task 2: AccessApiClient + AccessStore

**Files:** Create `src/app/core/http/access-api.service.ts`, `src/app/features/access/access.store.ts`; Test `src/app/features/access/access.store.spec.ts`.

- [ ] **Step 1: Create the API client.** Mirror `invitations-api.service.ts`:
```ts
import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { EnvService } from './env.service';

export type RedeemResponse = {
  access_status: string;
  role: string;
  role_upgraded: boolean;
};

export type SignupCode = {
  code: string;
  status: string; // 'available' | 'consumed'
};

@Injectable({ providedIn: 'root' })
export class AccessApiClient {
  private readonly http = inject(HttpClient);
  private readonly env = inject(EnvService);

  private get baseUrl(): string {
    return `${this.env.apiUrl}/access`;
  }

  /** Redeem an invite code to activate the current user. */
  redeem(code: string): Observable<RedeemResponse> {
    return this.http.post<RedeemResponse>(`${this.baseUrl}/redeem`, { code });
  }

  /** List the caller's signup codes (experts get a lazily-seeded allotment). */
  listCodes(): Observable<{ codes: SignupCode[] }> {
    return this.http.get<{ codes: SignupCode[] }>(`${this.baseUrl}/codes`);
  }

  /** Admin-only: mint additional expert codes. */
  generateCodes(count: number): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/codes`, { count });
  }
}
```
(Cookies are sent automatically by the existing `credentials.interceptor.ts`; the backend's `Set-Cookie` on an expert upgrade updates the session transparently.)

- [ ] **Step 2: Create the store.** Mirror the `SessionStore`/`GroupsStore` AsyncSlice pattern:
```ts
import { inject } from '@angular/core';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { firstValueFrom } from 'rxjs';
import { AccessApiClient, RedeemResponse, SignupCode } from '../../core/http/access-api.service';
import { AsyncSlice, errorAsyncSlice, idleAsyncSlice, loadingAsyncSlice, successAsyncSlice } from '../../core/state/async-state';

type AccessState = {
  redeemError: string | null;
  redeemStatus: AsyncSlice['status'];
  codes: SignupCode[];
  codesSlice: AsyncSlice;
};

const initialState: AccessState = {
  redeemError: null,
  redeemStatus: 'idle',
  codes: [],
  codesSlice: idleAsyncSlice(),
};

export const AccessStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withMethods((store, api = inject(AccessApiClient)) => ({
    async redeem(code: string): Promise<RedeemResponse | null> {
      patchState(store, { redeemError: null, redeemStatus: 'loading' });
      try {
        const res = await firstValueFrom(api.redeem(code));
        patchState(store, { redeemStatus: 'success' });
        return res;
      } catch (error) {
        const s = errorAsyncSlice(error);
        patchState(store, { redeemError: s.error, redeemStatus: s.status });
        return null;
      }
    },
    async loadCodes(): Promise<void> {
      patchState(store, { codesSlice: loadingAsyncSlice() });
      try {
        const { codes } = await firstValueFrom(api.listCodes());
        patchState(store, { codes, codesSlice: successAsyncSlice() });
      } catch (error) {
        patchState(store, { codesSlice: errorAsyncSlice(error) });
      }
    },
    async generateCodes(count: number): Promise<boolean> {
      try {
        await firstValueFrom(api.generateCodes(count));
        await this.loadCodes();
        return true;
      } catch {
        return false;
      }
    },
  })),
);
```
> Verify `AsyncSlice` field names and the `errorAsyncSlice(error)` shape in `src/app/core/state/async-state.ts` (it returns `{ status, error }`); adjust property reads if they differ.

- [ ] **Step 3: Write a store test** `access.store.spec.ts` (Vitest). Mock `AccessApiClient` with a provider override; assert `redeem` sets `redeemStatus='success'` and returns the response on success, and `redeemStatus='error'` + `redeemError` on failure; assert `loadCodes` populates `codes`. Follow the existing store-spec pattern (e.g. inspect `src/app/features/groups/*.spec.ts` or `auth-api.service.spec.ts` for the TestBed + provider-mock idiom).

- [ ] **Step 4: Run the test.**
Run: `pnpm -C web/dashboard-next test -- access.store` (or `make web-next:test`).
Expected: PASS.

- [ ] **Step 5: Commit.**
```bash
git add web/dashboard-next/src/app/core/http/access-api.service.ts web/dashboard-next/src/app/features/access/access.store.ts web/dashboard-next/src/app/features/access/access.store.spec.ts
git commit -m "feat(web): add AccessApiClient and AccessStore (redeem + codes)"
```

---

## Task 3: Access-active guard + `/welcome` routing

**Files:** Create `src/app/core/guards/access-active.guard.ts`; Modify `src/app/app.routes.ts`; Test `src/app/core/guards/access-active.guard.spec.ts`.

Context: `authGuard` (existing) only checks logged-in. The new guard additionally requires `access_status === 'active'` and redirects waitlisted users to `/welcome`. `/welcome` is a TOP-LEVEL route (sibling of the `ShellComponent` route) so it is NOT subject to the active gate.

- [ ] **Step 1: Write the guard.** Mirror `permission.guard.ts`:
```ts
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
    return router.createUrlTree(['/welcome']);
  };

  if (isSettled(session.status())) {
    return decide();
  }
  return toObservable(session.status).pipe(filter(isSettled), take(1), map(decide));
};
```

- [ ] **Step 2: Write an inverse guard for `/welcome`** (active users shouldn't see the waitlist screen). Add to the SAME file:
```ts
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
```

- [ ] **Step 3: Wire routes.** In `src/app/app.routes.ts`:
  - Add the import: `import { accessActiveGuard, waitlistedOnlyGuard } from './core/guards/access-active.guard';` and `import { WelcomePageComponent } from './pages/welcome/welcome-page.component';`
  - Add a top-level `/welcome` route BEFORE the `path: ''` Shell route:
```ts
  {
    path: 'welcome',
    component: WelcomePageComponent,
    canActivate: [authGuard, waitlistedOnlyGuard],
    title: 'Zeta',
  },
```
  - Add `accessActiveGuard` to the Shell route's `canActivate` (it currently is `canActivate: [authGuard]`):
```ts
  {
    path: '',
    component: ShellComponent,
    canActivate: [authGuard, accessActiveGuard],
    children: [ /* unchanged */ ],
  },
```
  > Leave the top-level `sessions/:groupId/:bookingId/call` route as-is — it is for active users in a live call; it already requires `permissionGuard`, which implies active membership. (If you want belt-and-suspenders, add `accessActiveGuard` there too; not required.)

- [ ] **Step 4: Write the guard test** `access-active.guard.spec.ts`: with a TestBed providing a `SessionStore` stub, assert that a `success` + `active` user returns `true`, and a `success` + `waitlisted` user returns a `UrlTree` to `/welcome`. Mirror `auth.guard.spec.ts` / `permission.guard.spec.ts`.

- [ ] **Step 5: Run tests + build.**
Run: `pnpm -C web/dashboard-next test -- access-active.guard` then `make web-next:build`.
Expected: PASS, build OK. (Build will fail until `WelcomePageComponent` exists — if doing strict TDD, create a minimal placeholder component first or land Task 4 before building. Recommended: implement Task 4 immediately after Step 4 here, then build once.)

- [ ] **Step 6: Commit** (together with Task 4 if build needs the component):
```bash
git add web/dashboard-next/src/app/core/guards/access-active.guard.ts web/dashboard-next/src/app/core/guards/access-active.guard.spec.ts web/dashboard-next/src/app/app.routes.ts
git commit -m "feat(web): gate shell on active access, route waitlisted to /welcome"
```

---

## Task 4: Welcome (code-redeem) screen

**Files:** Create `src/app/pages/welcome/welcome-page.component.ts`; Test `src/app/pages/welcome/welcome-page.component.spec.ts`.

A full-screen, centered, Clubhouse-style screen (NOT inside the Shell): headline, an invite-code input, submit, error display, and a logout link. On success it refreshes the session and routes into the app.

- [ ] **Step 1: Implement the component.** Reuse `z-*` components + reactive forms (the `create-group-page` pattern) + Transloco:
```ts
import { Component, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { AccessStore } from '../../features/access/access.store';
import { SessionStore } from '../../features/session/session.store';
import { ZButtonComponent } from '../../shared/ui/button/z-button.component';
import { ZFieldErrorComponent } from '../../shared/ui/field-error/z-field-error.component';
import { ZFieldLabelComponent } from '../../shared/ui/field-label/z-field-label.component';
import { ZTextInputComponent } from '../../shared/ui/text-input/z-text-input.component';

@Component({
  selector: 'app-welcome-page',
  imports: [
    ReactiveFormsModule,
    TranslocoPipe,
    ZButtonComponent,
    ZFieldErrorComponent,
    ZFieldLabelComponent,
    ZTextInputComponent,
  ],
  template: `
    <div class="grid min-h-dvh place-items-center bg-[var(--z-bg)] p-6">
      <div class="grid w-full max-w-md gap-6 rounded-lg border border-[var(--z-border)] bg-white p-8 shadow-sm">
        <div class="grid gap-2 text-center">
          <h1 class="text-2xl font-semibold">{{ 'access.welcome.title' | transloco }}</h1>
          <p class="text-sm leading-6 text-[var(--z-muted)]">{{ 'access.welcome.subtitle' | transloco }}</p>
        </div>

        <form class="grid gap-4" [formGroup]="form" (ngSubmit)="submit()">
          <label class="grid gap-2">
            <z-field-label [label]="'access.welcome.codeLabel' | transloco" [control]="form.controls.code" />
            <z-text-input
              formControlName="code"
              [placeholder]="'access.welcome.codePlaceholder' | transloco"
              ariaDescribedBy="welcome-code-error"
              [invalid]="(form.controls.code.dirty || form.controls.code.touched) && form.controls.code.invalid"
            />
            @if ((form.controls.code.dirty || form.controls.code.touched) && form.controls.code.invalid) {
              <z-field-error id="welcome-code-error" [message]="'access.welcome.codeRequired' | transloco" />
            }
          </label>

          @if (access.redeemStatus() === 'error') {
            <p class="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
              {{ 'access.welcome.invalidCode' | transloco }}
            </p>
          }

          <z-button type="submit" [disabled]="access.redeemStatus() === 'loading'">
            {{ access.redeemStatus() === 'loading' ? ('access.welcome.redeeming' | transloco) : ('access.welcome.submit' | transloco) }}
          </z-button>
        </form>

        <button type="button" class="text-center text-sm text-[var(--z-muted)] underline" (click)="session.logout()">
          {{ 'access.welcome.logout' | transloco }}
        </button>
      </div>
    </div>
  `,
})
export class WelcomePageComponent {
  protected readonly access = inject(AccessStore);
  protected readonly session = inject(SessionStore);
  private readonly router = inject(Router);
  protected readonly form = new FormGroup({
    code: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.pattern(/\S/)] }),
  });

  protected async submit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const res = await this.access.redeem(this.form.controls.code.value.trim());
    if (res) {
      // Refresh the session so the new access_status / role take effect, then enter the app.
      await this.session.loadCurrentUser();
      await this.router.navigate(['/']);
    }
  }
}
```
> Confirm the exact inputs of `z-text-input`, `z-field-label`, `z-field-error`, `z-button` against their component files (the create-group page is an accurate reference for all four). Do not guess prop names.

- [ ] **Step 2: Write a component test** `welcome-page.component.spec.ts`: with mocked `AccessStore` + `SessionStore`, submitting a valid code calls `AccessStore.redeem` and, on a non-null result, calls `SessionStore.loadCurrentUser` and navigates to `/`; submitting empty marks the control touched and does not call `redeem`. Mirror an existing page spec.

- [ ] **Step 3: Build + test.**
Run: `pnpm -C web/dashboard-next test -- welcome-page` then `make web-next:build`.
Expected: PASS, build OK.

- [ ] **Step 4: Commit** (may be combined with Task 3 Step 6 if build was deferred):
```bash
git add web/dashboard-next/src/app/pages/welcome/
git commit -m "feat(web): add waitlist welcome/redeem screen"
```

---

## Task 5: Role guard + invite-codes page

**Files:** Create `src/app/core/guards/role.guard.ts`, `src/app/pages/invite-codes/invite-codes-page.component.ts`; Modify `src/app/app.routes.ts`; Tests for both.

- [ ] **Step 1: Write the role guard.** Mirror `permission.guard.ts`, reading `route.data['roles']`:
```ts
import { inject } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { CanActivateFn, Router } from '@angular/router';
import { filter, map, take } from 'rxjs';
import { SessionStore } from '../../features/session/session.store';

const isSettled = (status: string) => status !== 'idle' && status !== 'loading';

/** Allows the route only for users whose role is in route.data['roles']. */
export const roleGuard: CanActivateFn = (route, _state) => {
  const session = inject(SessionStore);
  const router = inject(Router);
  const roles = (route.data['roles'] as string[] | undefined) ?? [];

  const decide = () => {
    if (session.status() !== 'success') {
      return router.createUrlTree(['/']);
    }
    const role = session.user()?.role ?? '';
    return roles.includes(role) || router.createUrlTree(['/']);
  };

  if (isSettled(session.status())) {
    return decide();
  }
  return toObservable(session.status).pipe(filter(isSettled), take(1), map(decide));
};
```

- [ ] **Step 2: Implement the invite-codes page.** Shows the caller's codes with status + copy buttons; admins also get a "generate" action. Uses `z-skeleton` while loading, `z-badge` for status, `z-button`.
```ts
import { Component, inject, OnInit } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { AccessStore } from '../../features/access/access.store';
import { SessionStore } from '../../features/session/session.store';
import { ZBadgeComponent } from '../../shared/ui/badge/z-badge.component';
import { ZButtonComponent } from '../../shared/ui/button/z-button.component';
import { ZSkeletonComponent } from '../../shared/ui/skeleton/z-skeleton.component';

@Component({
  selector: 'app-invite-codes-page',
  imports: [TranslocoPipe, ZBadgeComponent, ZButtonComponent, ZSkeletonComponent],
  template: `
    <div class="mx-auto grid max-w-2xl gap-5">
      <div class="grid gap-1">
        <h1 class="text-2xl font-semibold">{{ 'access.codes.title' | transloco }}</h1>
        <p class="text-sm leading-6 text-[var(--z-muted)]">{{ 'access.codes.subtitle' | transloco }}</p>
      </div>

      @if (access.codesSlice().status === 'loading') {
        <div class="grid gap-2">
          <z-skeleton class="h-12" /><z-skeleton class="h-12" /><z-skeleton class="h-12" />
        </div>
      } @else {
        <ul class="grid gap-2">
          @for (c of access.codes(); track c.code) {
            <li class="flex items-center justify-between rounded-md border border-[var(--z-border)] bg-white p-3">
              <code class="font-mono text-lg tracking-wider">{{ c.code }}</code>
              <div class="flex items-center gap-3">
                <z-badge>{{ ('access.codes.status.' + c.status) | transloco }}</z-badge>
                @if (c.status === 'available') {
                  <z-button variant="ghost" size="sm" (pressed)="copy(c.code)">{{ 'access.codes.copy' | transloco }}</z-button>
                }
              </div>
            </li>
          }
        </ul>

        @if (isAdmin()) {
          <z-button variant="secondary" (pressed)="generate()">{{ 'access.codes.generate' | transloco }}</z-button>
        }
      }
    </div>
  `,
})
export class InviteCodesPageComponent implements OnInit {
  protected readonly access = inject(AccessStore);
  private readonly session = inject(SessionStore);

  ngOnInit(): void {
    void this.access.loadCodes();
  }

  protected isAdmin(): boolean {
    return this.session.user()?.role === 'admin';
  }

  protected copy(code: string): void {
    void navigator.clipboard?.writeText(code);
  }

  protected generate(): void {
    void this.access.generateCodes(5);
  }
}
```
> Verify `z-badge`, `z-skeleton`, `z-button` inputs against their component files. If `z-skeleton` sizing differs from a `class` height, follow its actual API. If a `z-toast` confirmation on copy fits the app's pattern, prefer `AppShellStore.showToast` over silent copy.

- [ ] **Step 3: Register the route.** In `app.routes.ts`, add a Shell CHILD route (so it inherits `accessActiveGuard`), gated to expert/admin:
```ts
  import { roleGuard } from './core/guards/role.guard';
  import { InviteCodesPageComponent } from './pages/invite-codes/invite-codes-page.component';
  // inside the Shell children array:
      {
        path: 'invite-codes',
        component: InviteCodesPageComponent,
        canActivate: [roleGuard],
        data: { roles: ['expert', 'admin'] },
        title: 'Invite codes',
      },
```

- [ ] **Step 4: Tests.** `role.guard.spec.ts`: expert/admin → true, student → UrlTree to `/`. `invite-codes-page.component.spec.ts`: calls `loadCodes` on init; renders one row per code; shows generate only for admin. Mirror existing specs.

- [ ] **Step 5: Build + test.**
Run: `pnpm -C web/dashboard-next test -- "role.guard|invite-codes"` then `make web-next:build`.
Expected: PASS, build OK.

- [ ] **Step 6: Commit.**
```bash
git add web/dashboard-next/src/app/core/guards/role.guard.ts web/dashboard-next/src/app/core/guards/role.guard.spec.ts web/dashboard-next/src/app/pages/invite-codes/ web/dashboard-next/src/app/app.routes.ts
git commit -m "feat(web): add invite-codes page (expert/admin) with role guard"
```

---

## Task 6: Navigation entry for the codes page

**Files:** Modify `src/app/core/state/app-shell.store.ts`, `src/app/core/shell/shell.component.ts`, `src/app/core/shell/shell.html`.

- [ ] **Step 1: Extend the nav model + add the item.** In `app-shell.store.ts`:
  - Widen the `NavigationItem.icon` union to include `'invite-codes'`:
```ts
  icon: 'home' | 'videos' | 'groups' | 'sessions' | 'reports-expert' | 'reports-student' | 'invite-codes';
```
  - Add to the `navigation` array (after `reports-student`):
```ts
    {
      id: 'invite-codes',
      label: 'Invite codes',
      labelKey: 'common.nav.inviteCodes',
      href: '/invite-codes',
      icon: 'invite-codes',
    },
```

- [ ] **Step 2: Gate the nav item by role.** In `shell.component.ts`, inside the `navigation` computed filter, add a branch:
```ts
      if (item.id === 'invite-codes') {
        const role = this.session.user()?.role;
        return role === 'expert' || role === 'admin';
      }
```

- [ ] **Step 3: Render the icon.** In `shell.component.ts` imports, add a lucide icon (e.g. `LucideTicket`) to the `@lucide/angular` import list AND the component `imports` array. In `shell.html`, add a `@case ('invite-codes')` branch to BOTH `@switch (item.icon)` blocks (desktop sidebar ~line 30 and mobile drawer ~line 257):
```html
              @case ('invite-codes') {
                <svg lucideTicket class="size-4" aria-hidden="true"></svg>
              }
```
> Confirm `LucideTicket` exists in the installed `@lucide/angular`; if not, pick an available icon (e.g. `LucideKeyRound`) and use its matching `lucide*` attribute selector consistently in both switch blocks.

- [ ] **Step 4: Add the nav label key** `common.nav.inviteCodes` (done in Task 7).

- [ ] **Step 5: Build.**
Run: `make web-next:build`.
Expected: OK (no exhaustiveness or template errors).

- [ ] **Step 6: Commit.**
```bash
git add web/dashboard-next/src/app/core/state/app-shell.store.ts web/dashboard-next/src/app/core/shell/shell.component.ts web/dashboard-next/src/app/core/shell/shell.html
git commit -m "feat(web): add invite-codes nav entry for experts/admins"
```

---

## Task 7: i18n strings

**Files:** Modify `public/i18n/en.json`, `public/i18n/de.json`, `public/i18n/fr.json`.

- [ ] **Step 1: Add the `common.nav.inviteCodes` key** to each file's existing `common.nav` block (EN `"Invite codes"`, DE `"Einladungscodes"`, FR `"Codes d'invitation"`).

- [ ] **Step 2: Add a new top-level `access` block** to each file. EN:
```json
"access": {
  "welcome": {
    "title": "You're almost in",
    "subtitle": "Enter your invite code to activate your account.",
    "codeLabel": "Invite code",
    "codePlaceholder": "Enter your code",
    "codeRequired": "Please enter your invite code.",
    "invalidCode": "That code is invalid or has already been used.",
    "submit": "Activate",
    "redeeming": "Activating…",
    "logout": "Sign out"
  },
  "codes": {
    "title": "Invite codes",
    "subtitle": "Share these codes to invite new experts.",
    "copy": "Copy",
    "generate": "Generate more codes",
    "status": { "available": "Available", "consumed": "Used" }
  }
}
```
Provide accurate DE and FR translations of the same keys (DE is the primary product language — translate carefully; e.g. welcome.title "Fast geschafft", submit "Aktivieren", codes.title "Einladungscodes", status.available "Verfügbar", status.consumed "Verbraucht").

- [ ] **Step 3: Validate JSON + build.**
Run: `pnpm -C web/dashboard-next exec tsc -p tsconfig.app.json --noEmit` then `make web-next:build`. Optionally validate each file parses: `node -e "require('./web/dashboard-next/public/i18n/en.json')"` (repeat de/fr).
Expected: valid JSON, build OK.

- [ ] **Step 4: Commit.**
```bash
git add web/dashboard-next/public/i18n/en.json web/dashboard-next/public/i18n/de.json web/dashboard-next/public/i18n/fr.json
git commit -m "i18n(web): add access gate strings (welcome + codes)"
```

---

## Task 8: Full verification

- [ ] **Step 1: Lint.** `make web-next:lint` → clean.
- [ ] **Step 2: Build.** `make web-next:build` → succeeds.
- [ ] **Step 3: Tests.** `make web-next:test` → all pass (new guard/store/page specs + existing).
- [ ] **Step 4: Manual smoke (optional, needs backend running).** Log in as a waitlisted user → land on `/welcome`; submit a bad code → inline error; submit a valid expert code → activated, routed into the app, expert nav (incl. Invite codes) visible. An active user visiting `/welcome` is redirected to `/`.
- [ ] **Step 5: Screenshot.** Per AGENTS.md, UI changes need a screenshot in the PR — capture `/welcome` and `/invite-codes`.

---

## Self-review notes (gaps surfaced while writing)

- **Spec coverage:** waitlist hard lock-out (Task 3 gate → `/welcome`), code-redeem screen (Task 4), expert/admin codes page incl. admin generate (Task 5), nav discoverability (Task 6), i18n incl. DE (Task 7). `access_status` consumed from `/auth/me` (Task 1).
- **Backend contract used:** `POST /access/redeem {code}` → `{access_status, role, role_upgraded}`; `GET /access/codes` → `{codes:[{code,status}]}`; `POST /access/codes {count}` (admin). All delivered by Plan 1.
- **Verify-before-use:** every `z-*` component step says "confirm inputs against the component file" (per dashboard CLAUDE.md — don't guess prop names). The `AsyncSlice` shape and lucide icon availability are flagged to confirm.
- **Out of scope:** mobile redeem screen (Plan 3 / PR #15); the redeem screen here intentionally lives outside the Shell so the gate can't trap the user.
```
