import { Component, inject, OnInit, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { AccessStore } from '../../features/access/access.store';
import { SessionStore } from '../../features/session/session.store';
import { ZButtonComponent } from '../../shared/ui/button/z-button.component';
import { ZFieldErrorComponent } from '../../shared/ui/field-error/z-field-error.component';
import { ZFieldLabelComponent } from '../../shared/ui/field-label/z-field-label.component';
import { ZOtpInputComponent } from '../../shared/ui/otp-input/z-otp-input.component';

@Component({
  selector: 'app-welcome-page',
  imports: [
    ReactiveFormsModule,
    TranslocoPipe,
    ZButtonComponent,
    ZFieldErrorComponent,
    ZFieldLabelComponent,
    ZOtpInputComponent,
  ],
  template: `
    <div class="grid min-h-dvh place-items-center bg-[var(--z-bg)] p-6">
      <div
        class="grid w-full max-w-md gap-6 rounded-lg border border-[var(--z-border)] bg-white p-8 shadow-sm"
      >
        @if (showCodeEntry()) {
          <div class="grid gap-2 text-center">
            <h1 class="text-2xl font-semibold">{{ 'access.welcome.title' | transloco }}</h1>
            <p class="text-sm leading-6 text-[var(--z-muted)]">
              {{ 'access.welcome.subtitle' | transloco }}
            </p>
          </div>
          <form class="grid gap-4" [formGroup]="form" (ngSubmit)="submit()">
            <label class="grid gap-2">
              <z-field-label
                [label]="'access.welcome.codeLabel' | transloco"
                [control]="form.controls.code"
              />
              <z-otp-input
                formControlName="code"
                [length]="8"
                ariaDescribedBy="welcome-code-error"
                [invalid]="
                  (form.controls.code.dirty || form.controls.code.touched) &&
                  form.controls.code.invalid
                "
              />
              @if (
                (form.controls.code.dirty || form.controls.code.touched) &&
                form.controls.code.invalid
              ) {
                <z-field-error
                  id="welcome-code-error"
                  [message]="'access.welcome.codeRequired' | transloco"
                />
              }
            </label>
            @if (access.redeemStatus() === 'error') {
              <p
                role="alert"
                aria-live="assertive"
                class="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800"
              >
                {{ 'access.welcome.invalidCode' | transloco }}
              </p>
            }
            <div class="flex justify-end">
              <z-button type="submit" [disabled]="access.redeemStatus() === 'loading'">
                {{
                  access.redeemStatus() === 'loading'
                    ? ('access.welcome.redeeming' | transloco)
                    : ('access.welcome.submit' | transloco)
                }}
              </z-button>
            </div>
          </form>
          <button
            type="button"
            class="text-center text-sm text-[var(--z-muted)] underline"
            (click)="showCodeEntry.set(false)"
          >
            {{ 'access.welcome.back' | transloco }}
          </button>
        } @else {
          <div class="grid gap-2 text-center">
            <h1 class="text-2xl font-semibold">{{ 'access.welcome.waitlistTitle' | transloco }}</h1>
            <p class="text-sm leading-6 text-[var(--z-muted)]">
              {{ 'access.welcome.waitlistSubtitle' | transloco }}
            </p>
          </div>
          <z-button variant="secondary" (pressed)="showCodeEntry.set(true)">
            {{ 'access.welcome.haveCode' | transloco }}
          </z-button>
        }
        <button
          type="button"
          class="text-center text-sm text-[var(--z-muted)] underline"
          (click)="session.logout()"
        >
          {{ 'access.welcome.logout' | transloco }}
        </button>
      </div>
    </div>
  `,
})
export class WelcomePageComponent implements OnInit {
  protected readonly access = inject(AccessStore);
  protected readonly session = inject(SessionStore);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  protected readonly form = new FormGroup({
    code: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(8)],
    }),
  });
  protected readonly showCodeEntry = signal(false);

  ngOnInit(): void {
    this.access.resetRedeem();
    const code = this.route.snapshot.queryParamMap.get('code');
    if (code) {
      this.form.controls.code.setValue(code.toUpperCase());
      this.showCodeEntry.set(true);
    }
  }

  protected async submit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const res = await this.access.redeem(this.form.controls.code.value.trim());
    if (res) {
      await this.session.loadCurrentUser();
      await this.router.navigate(['/']);
    }
  }
}
