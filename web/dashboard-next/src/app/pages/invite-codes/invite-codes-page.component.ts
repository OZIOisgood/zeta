import { Component, inject, OnInit } from '@angular/core';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { AppShellStore } from '../../core/state/app-shell.store';
import { AccessStore } from '../../features/access/access.store';
import { SessionStore } from '../../features/session/session.store';
import { ZBadgeComponent } from '../../shared/ui/badge/z-badge.component';
import { ZButtonComponent } from '../../shared/ui/button/z-button.component';
import { ZSkeletonComponent } from '../../shared/ui/skeleton/z-skeleton.component';

type BadgeTone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger';

@Component({
  selector: 'app-invite-codes-page',
  imports: [TranslocoPipe, ZBadgeComponent, ZButtonComponent, ZSkeletonComponent],
  template: `
    <div class="mx-auto grid max-w-2xl gap-5">
      <div class="grid gap-1">
        <h1 class="text-2xl font-semibold">{{ 'access.codes.title' | transloco }}</h1>
        <p class="text-sm leading-6 text-[var(--z-muted)]">
          {{ 'access.codes.subtitle' | transloco }}
        </p>
      </div>

      @if (access.codesSlice().status === 'loading') {
        <div class="grid gap-2">
          <z-skeleton class="h-12"></z-skeleton>
          <z-skeleton class="h-12"></z-skeleton>
          <z-skeleton class="h-12"></z-skeleton>
        </div>
      } @else {
        <ul class="grid gap-2">
          @for (c of access.codes(); track c.code) {
            <li
              class="flex items-center justify-between rounded-md border border-[var(--z-border)] bg-white p-3"
            >
              <code class="font-mono text-lg tracking-wider">{{ c.code }}</code>
              <div class="flex items-center gap-3">
                <z-badge [tone]="badgeTone(c.status)">{{
                  'access.codes.status.' + c.status | transloco
                }}</z-badge>
                @if (c.status === 'available') {
                  <z-button variant="ghost" size="sm" (pressed)="copy(c.code)">{{
                    'access.codes.copy' | transloco
                  }}</z-button>
                }
              </div>
            </li>
          }
        </ul>
        @if (isAdmin()) {
          <z-button variant="secondary" (pressed)="generate()">{{
            'access.codes.generate' | transloco
          }}</z-button>
        }
      }
    </div>
  `,
})
export class InviteCodesPageComponent implements OnInit {
  protected readonly access = inject(AccessStore);
  private readonly session = inject(SessionStore);
  private readonly shell = inject(AppShellStore);
  private readonly transloco = inject(TranslocoService);

  ngOnInit(): void {
    void this.access.loadCodes();
  }

  protected isAdmin(): boolean {
    return this.session.user()?.role === 'admin';
  }

  protected badgeTone(status: string): BadgeTone {
    switch (status) {
      case 'available':
        return 'success';
      case 'redeemed':
        return 'neutral';
      default:
        return 'neutral';
    }
  }

  protected copy(code: string): void {
    void navigator.clipboard?.writeText(code);
  }

  protected async generate(): Promise<void> {
    const ok = await this.access.generateCodes(5);
    if (!ok) {
      this.shell.showToast(
        this.transloco.translate('access.codes.generateErrorTitle'),
        this.transloco.translate('access.codes.generateError'),
        'error',
      );
    }
  }
}
