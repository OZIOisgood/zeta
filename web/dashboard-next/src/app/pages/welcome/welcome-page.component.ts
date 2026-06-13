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
      <div
        class="grid w-full max-w-md gap-6 rounded-lg border border-[var(--z-border)] bg-white p-8 shadow-sm"
      >
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
            <z-text-input
              formControlName="code"
              [placeholder]="'access.welcome.codePlaceholder' | transloco"
              ariaDescribedBy="welcome-code-error"
              [invalid]="
                (form.controls.code.dirty || form.controls.code.touched) &&
                form.controls.code.invalid
              "
            />
            @if (
              (form.controls.code.dirty || form.controls.code.touched) && form.controls.code.invalid
            ) {
              <z-field-error
                id="welcome-code-error"
                [message]="'access.welcome.codeRequired' | transloco"
              />
            }
          </label>
          @if (access.redeemStatus() === 'error') {
            <p class="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
              {{ 'access.welcome.invalidCode' | transloco }}
            </p>
          }
          <z-button type="submit" [disabled]="access.redeemStatus() === 'loading'">
            {{
              access.redeemStatus() === 'loading'
                ? ('access.welcome.redeeming' | transloco)
                : ('access.welcome.submit' | transloco)
            }}
          </z-button>
        </form>
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
export class WelcomePageComponent {
  protected readonly access = inject(AccessStore);
  protected readonly session = inject(SessionStore);
  private readonly router = inject(Router);
  protected readonly form = new FormGroup({
    code: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(/\S/)],
    }),
  });

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
