import { Component, inject, OnInit, signal } from '@angular/core';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { LucideTicket } from '@lucide/angular';
import { AppShellStore } from '../../core/state/app-shell.store';
import { AccessStore } from '../../features/access/access.store';
import { SessionStore } from '../../features/session/session.store';
import { ZBadgeComponent } from '../../shared/ui/badge/z-badge.component';
import { ZButtonComponent } from '../../shared/ui/button/z-button.component';
import { ZEmptyStateComponent } from '../../shared/ui/empty-state/z-empty-state.component';
import { ZSkeletonComponent } from '../../shared/ui/skeleton/z-skeleton.component';

type BadgeTone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger';

@Component({
  selector: 'app-invite-codes-section',
  imports: [
    TranslocoPipe,
    ZBadgeComponent,
    ZButtonComponent,
    ZEmptyStateComponent,
    ZSkeletonComponent,
    LucideTicket,
  ],
  template: `
    <section class="grid gap-5 rounded-lg border border-[var(--z-border)] bg-white p-5 shadow-sm">
      <div class="flex items-start gap-3 border-b border-[var(--z-border)] pb-4">
        <span
          class="grid size-10 shrink-0 place-items-center rounded-md bg-[var(--z-surface-warm)] text-[var(--z-primary)]"
        >
          <svg lucideTicket class="size-5" aria-hidden="true"></svg>
        </span>
        <div class="min-w-0 flex-1">
          <h2 class="text-base font-semibold">{{ 'access.codes.title' | transloco }}</h2>
          <p class="mt-1 text-sm leading-5 text-[var(--z-muted)]">
            {{ 'access.codes.subtitle' | transloco }}
          </p>
        </div>
        @if (isAdmin()) {
          <z-button variant="secondary" size="sm" (pressed)="generate()">{{
            'access.codes.generate' | transloco
          }}</z-button>
        }
      </div>

      @if (access.codesSlice().status === 'loading') {
        <div class="grid gap-2">
          <z-skeleton class="h-12"></z-skeleton>
          <z-skeleton class="h-12"></z-skeleton>
          <z-skeleton class="h-12"></z-skeleton>
        </div>
      } @else if (access.codesSlice().status === 'error') {
        <p class="text-sm leading-6 text-[var(--z-danger)]">
          {{ 'access.codes.loadError' | transloco }}
        </p>
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
                    (copiedCode() === c.code ? 'common.actions.copied' : 'access.codes.copy')
                      | transloco
                  }}</z-button>
                }
              </div>
            </li>
          } @empty {
            <li>
              <z-empty-state
                [title]="'access.codes.empty' | transloco"
                [description]="'access.codes.emptyDescription' | transloco"
              ></z-empty-state>
            </li>
          }
        </ul>
      }
    </section>
  `,
})
export class InviteCodesSectionComponent implements OnInit {
  protected readonly access = inject(AccessStore);
  private readonly session = inject(SessionStore);
  private readonly shell = inject(AppShellStore);
  private readonly transloco = inject(TranslocoService);
  protected readonly copiedCode = signal<string | null>(null);

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
      case 'consumed':
        return 'neutral';
      default:
        return 'neutral';
    }
  }

  protected async copy(code: string): Promise<void> {
    await navigator.clipboard?.writeText(code);
    this.copiedCode.set(code);
    this.shell.showToast(
      this.transloco.translate('toast.successTitle'),
      this.transloco.translate('access.codes.copied'),
      'success',
    );
    setTimeout(() => this.copiedCode.set(null), 2000);
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
