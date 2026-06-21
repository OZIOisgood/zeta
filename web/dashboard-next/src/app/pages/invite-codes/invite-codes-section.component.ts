import { Component, inject, OnInit, signal } from '@angular/core';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { LucideCopy, LucideTicket } from '@lucide/angular';
import { SignupCode } from '../../core/http/access-api.service';
import { AppShellStore } from '../../core/state/app-shell.store';
import { AccessStore } from '../../features/access/access.store';
import { ZBadgeComponent } from '../../shared/ui/badge/z-badge.component';
import { ZButtonComponent } from '../../shared/ui/button/z-button.component';
import { ZEmptyStateComponent } from '../../shared/ui/empty-state/z-empty-state.component';
import { ZSkeletonComponent } from '../../shared/ui/skeleton/z-skeleton.component';

@Component({
  selector: 'app-invite-codes-section',
  imports: [
    TranslocoPipe,
    LucideCopy,
    LucideTicket,
    ZBadgeComponent,
    ZButtonComponent,
    ZEmptyStateComponent,
    ZSkeletonComponent,
  ],
  template: `
    <section class="overflow-hidden rounded-lg border border-[var(--z-border)] bg-white shadow-sm">
      <div class="flex items-start gap-4 border-b border-[var(--z-border)] p-5">
        <span
          class="grid size-10 shrink-0 place-items-center rounded-md bg-[var(--z-surface-warm)] text-[var(--z-primary)]"
        >
          <svg lucideTicket class="size-5" aria-hidden="true"></svg>
        </span>
        <div class="min-w-0 flex-1">
          <h2 class="text-base font-semibold">{{ 'access.codes.title' | transloco }}</h2>
          <p class="mt-1 max-w-2xl text-sm leading-5 text-[var(--z-muted)]">
            {{ 'access.codes.subtitle' | transloco }}
          </p>
        </div>
      </div>

      <div class="border-b border-[var(--z-border)] bg-white px-5 py-4">
        <div class="flex flex-wrap items-center justify-between gap-2 text-sm">
          <span class="font-semibold">
            {{
              'access.codes.allowance'
                | transloco: { used: access.successfulReferrals(), limit: access.referralLimit() }
            }}
          </span>
          <span class="text-[var(--z-muted)]">
            {{
              'access.codes.allowanceRemaining'
                | transloco: { remaining: access.remainingReferrals() }
            }}
          </span>
        </div>
        <div
          class="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--z-surface-warm)]"
          aria-hidden="true"
        >
          <div
            class="h-full rounded-full bg-[var(--z-primary)] transition-all"
            [style.width.%]="allowancePercent()"
          ></div>
        </div>
      </div>

      <div class="p-5">
        @if (access.codesSlice().status === 'loading') {
          <div class="grid gap-2">
            @for (_ of [1, 2, 3, 4, 5]; track $index) {
              <z-skeleton class="h-16"></z-skeleton>
            }
          </div>
        } @else if (access.codesSlice().status === 'error') {
          <p class="text-sm leading-6 text-[var(--z-danger)]">
            {{ 'access.codes.loadError' | transloco }}
          </p>
        } @else {
          <ul class="divide-y divide-[var(--z-border)] rounded-md border border-[var(--z-border)]">
            @for (code of access.codes(); track code.id || code.code) {
              <li class="grid gap-3 p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                <div class="min-w-0">
                  <div class="flex flex-wrap items-center gap-3">
                    <code class="font-mono text-lg font-semibold tracking-wider">{{
                      code.code
                    }}</code>
                    <z-badge [tone]="code.status === 'available' ? 'success' : 'neutral'">{{
                      'access.codes.status.' + code.status | transloco
                    }}</z-badge>
                  </div>
                  @if (usedDate(code); as date) {
                    <p class="mt-1 text-xs text-[var(--z-muted)]">{{ date }}</p>
                  }
                </div>
                @if (code.status === 'available') {
                  <z-button variant="ghost" size="sm" (pressed)="copy(code.code)">
                    <svg lucideCopy class="size-4" aria-hidden="true"></svg>
                    {{
                      (copiedCode() === code.code ? 'common.actions.copied' : 'access.codes.copy')
                        | transloco
                    }}
                  </z-button>
                }
              </li>
            } @empty {
              <li class="border-0">
                <z-empty-state
                  [title]="'access.codes.empty' | transloco"
                  [description]="'access.codes.emptyDescription' | transloco"
                />
              </li>
            }
          </ul>
        }
      </div>
    </section>
  `,
})
export class InviteCodesSectionComponent implements OnInit {
  protected readonly access = inject(AccessStore);
  private readonly shell = inject(AppShellStore);
  private readonly transloco = inject(TranslocoService);
  protected readonly copiedCode = signal<string | null>(null);

  ngOnInit(): void {
    void this.access.loadCodes();
  }

  protected allowancePercent(): number {
    const limit = this.access.referralLimit();
    return limit ? (this.access.successfulReferrals() / limit) * 100 : 0;
  }

  protected usedDate(code: SignupCode): string {
    if (code.status !== 'consumed' || !code.consumed_at) return '';
    const date = new Intl.DateTimeFormat(this.transloco.getActiveLang(), {
      dateStyle: 'medium',
    }).format(new Date(code.consumed_at));
    return this.transloco.translate('access.codes.used', { date });
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
}
