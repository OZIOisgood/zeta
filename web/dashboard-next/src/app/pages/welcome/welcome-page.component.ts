import { Component, OnInit, computed, inject, signal, viewChild } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import {
  LucideArrowLeft,
  LucideArrowRight,
  LucideCheck,
  LucideCircleHelp,
  LucideGraduationCap,
  LucideLock,
  LucideShieldCheck,
  LucideTicket,
  LucideUsers,
} from '@lucide/angular';
import { AccessStore } from '../../features/access/access.store';
import { SessionStore } from '../../features/session/session.store';
import { ZButtonComponent } from '../../shared/ui/button/z-button.component';
import { ZFieldErrorComponent } from '../../shared/ui/field-error/z-field-error.component';
import { ZOtpInputComponent } from '../../shared/ui/otp-input/z-otp-input.component';

const CODE_LENGTH = 8;
const CODE_PATTERN = /^[0-9A-HJKMNP-TV-Z]{8}$/;

@Component({
  selector: 'app-welcome-page',
  imports: [
    ReactiveFormsModule,
    TranslocoPipe,
    LucideArrowLeft,
    LucideArrowRight,
    LucideCheck,
    LucideCircleHelp,
    LucideGraduationCap,
    LucideLock,
    LucideShieldCheck,
    LucideTicket,
    LucideUsers,
    ZButtonComponent,
    ZFieldErrorComponent,
    ZOtpInputComponent,
  ],
  template: `
    <div class="grid min-h-dvh bg-[var(--z-bg)] md:grid-cols-[0.84fr_1.16fr]">
      <aside
        class="relative hidden flex-col justify-between gap-10 overflow-hidden bg-[#211309] p-8 text-[var(--z-bg)] md:flex lg:p-14"
      >
        <div class="relative z-10 flex items-center gap-3.5">
          <img
            src="assets/brand/strido/strido-mark-128.png"
            width="44"
            height="44"
            class="size-11 rounded-xl"
            alt=""
          />
          <div>
            <div class="text-[22px] font-bold leading-none tracking-tight">Strido</div>
            <div class="mt-1 text-xs text-white/60">{{ 'app.tagline' | transloco }}</div>
          </div>
        </div>

        <div class="relative z-10 max-w-sm">
          <h2 class="max-w-[18ch] text-pretty text-4xl font-bold leading-[1.05] tracking-tight">
            {{ 'access.welcome.brandHeadline' | transloco }}
          </h2>
          <p class="mt-4 max-w-[34ch] text-[15px] leading-relaxed text-white/70">
            {{ 'access.welcome.brandSubline' | transloco }}
          </p>
        </div>

        <div class="relative z-10 flex flex-wrap gap-x-4 gap-y-2 text-xs text-white/50">
          <a class="hover:text-white" [href]="legalUrl('imprint')">{{
            'common.legal.imprint' | transloco
          }}</a>
          <a class="hover:text-white" [href]="legalUrl('privacy')">{{
            'common.legal.privacy' | transloco
          }}</a>
          <span>© {{ year }} Strido</span>
        </div>

        <div
          class="pointer-events-none absolute -bottom-36 -right-32 size-[460px] rounded-full"
          style="background: radial-gradient(circle, rgba(234,88,12,0.24), transparent 62%)"
          aria-hidden="true"
        ></div>
        <img
          src="assets/brand/strido/strido-mark-256.png"
          class="pointer-events-none absolute -bottom-14 -right-8 w-[290px] opacity-[0.07] grayscale"
          style="filter: grayscale(1) brightness(3)"
          alt=""
          aria-hidden="true"
        />
      </aside>

      <main class="flex min-w-0 flex-col">
        <div class="flex items-center gap-3 bg-[#211309] px-5 py-4 text-white md:hidden">
          <img src="assets/brand/strido/strido-mark-128.png" class="size-9 rounded-lg" alt="" />
          <div>
            <div class="font-bold leading-none">Strido</div>
            <div class="mt-1 text-[11px] text-white/60">{{ 'app.tagline' | transloco }}</div>
          </div>
        </div>

        <div class="flex flex-1 items-center justify-center px-6 py-10 sm:p-12 lg:p-[72px]">
          <div class="w-full max-w-md">
            @switch (view()) {
              @case ('waitlist') {
                <p class="eyebrow">{{ 'access.welcome.eyebrowWaitlist' | transloco }}</p>
                <h1 class="title">{{ 'access.welcome.waitlistTitle' | transloco }}</h1>
                <p class="lead">{{ 'access.welcome.waitlistBody' | transloco }}</p>
                <div class="mt-7 grid gap-3">
                  <z-button [fullWidth]="true" (pressed)="showCode.set(true)">
                    <svg lucideTicket class="size-[18px]" aria-hidden="true"></svg>
                    {{ 'access.welcome.enterCode' | transloco }}
                  </z-button>
                  <button type="button" class="text-link" (click)="session.logout()">
                    {{ 'access.welcome.signOut' | transloco }}
                  </button>
                </div>
              }

              @case ('invitation') {
                @if (access.previewSlice().status === 'loading') {
                  <div class="animate-pulse" aria-label="Loading invitation">
                    <div class="h-3 w-28 rounded bg-[var(--z-border)]"></div>
                    <div class="mt-5 h-10 w-4/5 rounded bg-[var(--z-border)]"></div>
                    <div class="mt-4 h-20 rounded bg-[var(--z-surface-warm)]"></div>
                    <div class="mt-7 h-11 rounded bg-[var(--z-primary-soft)]"></div>
                  </div>
                } @else if (access.preview()) {
                  <p class="eyebrow">{{ 'access.welcome.groupEyebrow' | transloco }}</p>
                  <h1 class="title">{{ 'access.welcome.groupTitle' | transloco }}</h1>
                  <p class="lead">{{ 'access.welcome.groupBody' | transloco }}</p>
                  <div
                    class="mt-6 flex items-center gap-4 rounded-xl border border-[var(--z-border)] bg-white p-4 shadow-sm"
                  >
                    <div
                      class="grid size-12 shrink-0 place-items-center overflow-hidden rounded-lg bg-[var(--z-surface-warm)] text-[var(--z-primary)]"
                    >
                      @if (access.preview()?.group?.avatar) {
                        <img
                          [src]="avatarSrc(access.preview()?.group?.avatar || '')"
                          class="size-full object-cover"
                          alt=""
                        />
                      } @else {
                        <svg lucideUsers class="size-5" aria-hidden="true"></svg>
                      }
                    </div>
                    <div class="min-w-0">
                      <div class="truncate font-semibold">{{ access.preview()?.group?.name }}</div>
                      <div class="mt-1 text-sm text-[var(--z-muted)]">
                        {{ 'access.welcome.groupRole' | transloco }}
                      </div>
                    </div>
                  </div>
                  @if (access.redeemStatus() === 'error') {
                    <z-field-error
                      id="welcome-group-error"
                      class="mt-4"
                      [message]="'access.welcome.errorInvalid' | transloco"
                    />
                  }
                  <div class="mt-7 grid gap-3">
                    <z-button
                      [fullWidth]="true"
                      [disabled]="access.isSubmitting()"
                      (pressed)="redeem()"
                    >
                      @if (access.isSubmitting()) {
                        <span class="spinner" aria-hidden="true"></span>
                        {{ 'access.welcome.activating' | transloco }}
                      } @else {
                        {{ 'access.welcome.joinGroup' | transloco }}
                        <svg lucideArrowRight class="size-[18px]" aria-hidden="true"></svg>
                      }
                    </z-button>
                    <button
                      type="button"
                      class="text-link"
                      [disabled]="access.isSubmitting()"
                      (click)="session.logout()"
                    >
                      {{ 'access.welcome.notYou' | transloco }}
                    </button>
                  </div>
                } @else {
                  <p class="eyebrow">{{ 'access.welcome.eyebrowCode' | transloco }}</p>
                  <h1 class="title">{{ 'access.welcome.inviteUnavailableTitle' | transloco }}</h1>
                  <p class="lead">{{ 'access.welcome.inviteUnavailableBody' | transloco }}</p>
                  <div class="mt-7 grid gap-3">
                    <z-button [fullWidth]="true" (pressed)="useManualEntry()">{{
                      'access.welcome.enterAnotherCode' | transloco
                    }}</z-button>
                    <button type="button" class="text-link" (click)="session.logout()">
                      {{ 'access.welcome.signOut' | transloco }}
                    </button>
                  </div>
                }
              }

              @case ('code') {
                <button
                  type="button"
                  class="back-link"
                  [disabled]="access.isSubmitting()"
                  (click)="backToWaitlist()"
                >
                  <svg lucideArrowLeft class="size-[15px]" aria-hidden="true"></svg>
                  {{ 'access.welcome.back' | transloco }}
                </button>
                <p class="eyebrow">{{ 'access.welcome.eyebrowCode' | transloco }}</p>
                <h1 class="title">{{ 'access.welcome.codeTitle' | transloco }}</h1>
                <p class="lead">{{ 'access.welcome.codeBody' | transloco }}</p>

                <div class="mt-7">
                  <label class="mb-3.5 block text-[13px] font-semibold" for="welcome-code">
                    {{ 'access.welcome.codeLabel' | transloco }}
                  </label>
                  <z-otp-input
                    #otp
                    id="welcome-code"
                    [formControl]="codeControl"
                    [length]="codeLength"
                    [disabled]="access.isSubmitting()"
                    [invalid]="showFieldError() || access.redeemStatus() === 'error'"
                    [ariaLabel]="'access.welcome.codeLabel' | transloco"
                    ariaDescribedBy="welcome-code-msg"
                    (submitted)="redeem()"
                  />
                </div>

                @if (access.redeemStatus() === 'error') {
                  <z-field-error
                    id="welcome-code-msg"
                    class="mt-3.5"
                    [message]="'access.welcome.errorInvalid' | transloco"
                  />
                } @else if (showFieldError()) {
                  <z-field-error
                    id="welcome-code-msg"
                    class="mt-3.5"
                    [message]="'access.welcome.errorIncomplete' | transloco"
                  />
                } @else {
                  <p
                    id="welcome-code-msg"
                    class="mt-3.5 flex gap-2 text-[13px] text-[var(--z-muted)]"
                  >
                    <svg lucideLock class="mt-0.5 size-[15px] shrink-0" aria-hidden="true"></svg>
                    {{ 'access.welcome.codeHint' | transloco }}
                  </p>
                }

                <div class="mt-7 grid gap-3">
                  <z-button
                    [fullWidth]="true"
                    [disabled]="access.isSubmitting() || codeControl.invalid"
                    (pressed)="redeem()"
                  >
                    @if (access.isSubmitting()) {
                      <span class="spinner" aria-hidden="true"></span>
                      {{ 'access.welcome.activating' | transloco }}
                    } @else {
                      {{ 'access.welcome.activate' | transloco }}
                      <svg lucideArrowRight class="size-[18px]" aria-hidden="true"></svg>
                    }
                  </z-button>
                  <a class="help-link" href="mailto:support@strido.net">
                    <svg lucideCircleHelp class="size-[15px]" aria-hidden="true"></svg>
                    {{ 'access.welcome.noCode' | transloco }}
                  </a>
                </div>
              }

              @case ('success') {
                <div
                  class="mb-6 grid size-14 place-items-center rounded-full border border-green-200 bg-green-50 text-[var(--z-success)]"
                >
                  <svg lucideCheck class="size-7" aria-hidden="true"></svg>
                </div>
                <p class="eyebrow">{{ 'access.welcome.eyebrowDone' | transloco }}</p>
                <h1 class="title">{{ 'access.welcome.successTitle' | transloco }}</h1>
                <p class="lead">
                  @if (access.role() === 'expert') {
                    {{ 'access.welcome.successExpert' | transloco }}
                  } @else {
                    {{
                      'access.welcome.successStudent'
                        | transloco: { group: access.joinedGroup()?.name }
                    }}
                  }
                </p>
                <div
                  class="mt-5 inline-flex items-center gap-2 rounded-full border border-[var(--z-primary-soft)] bg-[var(--z-surface-warm)] px-3.5 py-2 text-[13px] font-semibold text-[var(--z-primary-strong)]"
                >
                  @if (access.role() === 'expert') {
                    <svg lucideShieldCheck class="size-[15px]" aria-hidden="true"></svg>
                    {{ 'access.welcome.roleExpert' | transloco }}
                  } @else {
                    <svg lucideGraduationCap class="size-[15px]" aria-hidden="true"></svg>
                    {{ 'access.welcome.roleStudent' | transloco }}
                  }
                </div>
                <div class="mt-7">
                  <z-button [fullWidth]="true" (pressed)="enterApp()">
                    {{ 'access.welcome.goToApp' | transloco }}
                    <svg lucideArrowRight class="size-[18px]" aria-hidden="true"></svg>
                  </z-button>
                </div>
              }
            }
          </div>
        </div>
      </main>
    </div>
  `,
  styles: `
    .eyebrow {
      margin-bottom: 18px;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.14em;
      color: var(--z-primary-text);
    }
    .eyebrow::before {
      content: '';
      width: 7px;
      height: 7px;
      border-radius: 999px;
      background: var(--z-primary);
    }
    .title {
      text-wrap: balance;
      font-size: 34px;
      font-weight: 700;
      line-height: 1.08;
      letter-spacing: -0.025em;
      color: var(--z-text);
    }
    .lead {
      margin-top: 14px;
      max-width: 42ch;
      font-size: 15px;
      line-height: 1.7;
      color: var(--z-muted);
    }
    .text-link {
      margin-inline: auto;
      width: fit-content;
      font-size: 14px;
      color: var(--z-muted);
    }
    .text-link:hover,
    .back-link:hover {
      color: var(--z-text);
    }
    .back-link {
      margin-bottom: 28px;
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 13px;
      font-weight: 600;
      color: var(--z-muted);
    }
    .help-link {
      margin-inline: auto;
      display: flex;
      width: fit-content;
      align-items: center;
      gap: 6px;
      font-size: 13px;
      font-weight: 600;
      color: var(--z-primary-text);
    }
    .help-link:hover {
      text-decoration: underline;
    }
    .spinner {
      width: 16px;
      height: 16px;
      border: 2px solid white;
      border-right-color: transparent;
      border-radius: 999px;
      animation: spin 0.7s linear infinite;
    }
    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }
    @media (prefers-reduced-motion: reduce) {
      .spinner {
        animation-duration: 1.6s;
      }
    }
  `,
})
export class WelcomePageComponent implements OnInit {
  protected readonly access = inject(AccessStore);
  protected readonly session = inject(SessionStore);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  protected readonly year = new Date().getFullYear();
  protected readonly codeLength = CODE_LENGTH;
  protected readonly showCode = signal(false);
  protected readonly hasDeepLink = signal(false);
  protected readonly submitAttempted = signal(false);
  protected readonly codeControl = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.pattern(CODE_PATTERN)],
  });
  private readonly otp = viewChild<ZOtpInputComponent>('otp');

  protected readonly view = computed<'waitlist' | 'invitation' | 'code' | 'success'>(() => {
    if (this.access.isActivated()) return 'success';
    if (this.hasDeepLink()) return 'invitation';
    return this.showCode() ? 'code' : 'waitlist';
  });
  protected readonly showFieldError = computed(
    () => this.submitAttempted() && this.codeControl.invalid,
  );

  ngOnInit(): void {
    this.access.resetRedeem();
    const code = this.route.snapshot.queryParamMap.get('code')?.trim().toUpperCase();
    if (!code) return;
    this.codeControl.setValue(code);
    this.hasDeepLink.set(true);
    void this.access.previewGroupInvitation(code);
  }

  protected backToWaitlist(): void {
    this.showCode.set(false);
    this.submitAttempted.set(false);
    this.access.resetError();
  }

  protected useManualEntry(): void {
    this.hasDeepLink.set(false);
    this.showCode.set(true);
    this.access.resetError();
    queueMicrotask(() => this.otp()?.reselect());
  }

  protected async redeem(): Promise<void> {
    this.submitAttempted.set(true);
    this.access.resetError();
    if (this.codeControl.invalid) return;
    const result = await this.access.redeem(this.codeControl.value);
    if (!result) queueMicrotask(() => this.otp()?.reselect());
  }

  protected async enterApp(): Promise<void> {
    await this.session.loadCurrentUser();
    const group = this.access.joinedGroup();
    await this.router.navigate(group ? ['/groups', group.id] : ['/']);
  }

  protected legalUrl(page: 'imprint' | 'privacy'): string {
    const language = this.session.user()?.language ?? 'en';
    const prefix = language === 'de' ? '' : `/${language}`;
    return `https://strido.net${prefix}/${page}.html`;
  }

  protected avatarSrc(avatar: string): string {
    return avatar.startsWith('data:') ? avatar : `data:image/jpeg;base64,${avatar}`;
  }
}
