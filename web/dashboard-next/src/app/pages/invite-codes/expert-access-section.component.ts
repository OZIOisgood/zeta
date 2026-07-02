import { Component, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { LucideBadgeCheck } from '@lucide/angular';
import { AppShellStore } from '../../core/state/app-shell.store';
import { AccessStore } from '../../features/access/access.store';
import { SessionStore } from '../../features/session/session.store';
import { ZButtonComponent } from '../../shared/ui/button/z-button.component';
import { ZFieldErrorComponent } from '../../shared/ui/field-error/z-field-error.component';
import { ZOtpInputComponent } from '../../shared/ui/otp-input/z-otp-input.component';

@Component({
  selector: 'app-expert-access-section',
  imports: [
    ReactiveFormsModule,
    TranslocoPipe,
    LucideBadgeCheck,
    ZButtonComponent,
    ZFieldErrorComponent,
    ZOtpInputComponent,
  ],
  template: `
    <section class="overflow-hidden rounded-lg border border-[var(--z-border)] bg-white shadow-sm">
      <div class="flex items-start gap-4 border-b border-[var(--z-border)] p-5">
        <span
          class="grid size-10 shrink-0 place-items-center rounded-md bg-[var(--z-surface-warm)] text-[var(--z-primary)]"
        >
          <svg lucideBadgeCheck class="size-5" aria-hidden="true"></svg>
        </span>
        <div class="min-w-0">
          <h2 class="text-base font-semibold">{{ 'access.expertAccess.title' | transloco }}</h2>
          <p class="mt-1 max-w-2xl text-sm leading-5 text-[var(--z-muted)]">
            {{ 'access.expertAccess.description' | transloco }}
          </p>
        </div>
      </div>

      <form class="grid max-w-xl gap-5 p-5" (submit)="redeem($event)">
        <div class="grid gap-3">
          <label class="text-sm font-semibold" for="expert-access-code">
            {{ 'access.expertAccess.codeLabel' | transloco }}
          </label>
          <z-otp-input
            id="expert-access-code"
            [formControl]="codeControl"
            [ariaLabel]="'access.expertAccess.codeLabel' | transloco"
            ariaDescribedBy="expert-access-hint expert-access-error"
            [invalid]="access.redeemStatus() === 'error'"
            [disabled]="access.isSubmitting()"
            (submitted)="redeem()"
          />
          <p id="expert-access-hint" class="text-xs leading-5 text-[var(--z-muted)]">
            {{ 'access.welcome.codeHint' | transloco }}
          </p>
          @if (access.redeemStatus() === 'error') {
            <z-field-error
              id="expert-access-error"
              [message]="'access.expertAccess.invalidCode' | transloco"
            />
          }
        </div>

        <div>
          <z-button
            type="submit"
            [disabled]="codeControl.invalid || access.isSubmitting()"
            [mobileFullWidth]="true"
          >
            {{
              (access.isSubmitting()
                ? 'access.expertAccess.upgrading'
                : 'access.expertAccess.activate'
              ) | transloco
            }}
          </z-button>
        </div>
      </form>
    </section>
  `,
})
export class ExpertAccessSectionComponent {
  protected readonly access = inject(AccessStore);
  private readonly session = inject(SessionStore);
  private readonly router = inject(Router);
  private readonly shell = inject(AppShellStore);
  private readonly transloco = inject(TranslocoService);

  protected readonly codeControl = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.pattern(/^[0-9A-HJKMNP-TV-Z]{8}$/)],
  });

  constructor() {
    this.access.resetRedeem();
    this.codeControl.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => {
      this.access.resetError();
    });
  }

  protected async redeem(event?: Event): Promise<void> {
    event?.preventDefault();
    if (this.codeControl.invalid || this.access.isSubmitting()) {
      this.codeControl.markAsTouched();
      return;
    }

    const result = await this.access.redeem(this.codeControl.value);
    if (!result?.role_upgraded || result.role !== 'expert') return;

    await this.session.loadCurrentUser();
    this.shell.showToast(
      this.transloco.translate('toast.successTitle'),
      this.transloco.translate('access.expertAccess.success'),
      'success',
    );
    await this.router.navigate(['/preferences', 'invite-codes']);
  }
}
