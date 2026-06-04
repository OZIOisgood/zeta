import { Component, OnDestroy, computed, inject, input, signal } from '@angular/core';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  LucideCopy,
  LucideDownload,
  LucideLink,
  LucideMail,
  LucideQrCode,
} from '@lucide/angular';
import {
  NgpDialog,
  NgpDialogDescription,
  NgpDialogOverlay,
  NgpDialogTitle,
} from 'ng-primitives/dialog';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { GroupsApiClient, GroupInvitation } from '../../core/http/groups-api.service';
import { AppShellStore } from '../../core/state/app-shell.store';
import { ZButtonComponent } from '../../shared/ui/button/z-button.component';
import { ZFieldErrorComponent } from '../../shared/ui/field-error/z-field-error.component';
import { ZFieldLabelComponent } from '../../shared/ui/field-label/z-field-label.component';
import { ZSkeletonComponent } from '../../shared/ui/skeleton/z-skeleton.component';
import { ZTextInputComponent } from '../../shared/ui/text-input/z-text-input.component';

@Component({
  selector: 'app-group-invitation-dialog',
  imports: [
    ReactiveFormsModule,
    TranslocoPipe,
    NgpDialog,
    NgpDialogDescription,
    NgpDialogOverlay,
    NgpDialogTitle,
    ZButtonComponent,
    ZFieldErrorComponent,
    ZFieldLabelComponent,
    ZSkeletonComponent,
    ZTextInputComponent,
    LucideCopy,
    LucideDownload,
    LucideLink,
    LucideMail,
    LucideQrCode,
  ],
  template: `
    <div
      ngpDialogOverlay
      animate.enter="z-dialog-overlay-enter"
      animate.leave="z-dialog-overlay-leave"
      class="fixed inset-0 z-50 grid place-items-center bg-stone-950/35 p-4 backdrop-blur-sm"
    >
      <section
        ngpDialog
        [ngpDialogModal]="true"
        animate.enter="z-dialog-panel-enter"
        animate.leave="z-dialog-panel-leave"
        class="w-full max-w-lg rounded-lg border border-[var(--z-border)] bg-white p-5 shadow-2xl shadow-stone-950/15"
      >
        <div class="flex items-start gap-3">
          <span
            class="grid size-10 shrink-0 place-items-center rounded-md bg-[var(--z-surface-warm)] text-[var(--z-primary)]"
          >
            <svg lucideQrCode class="size-5" aria-hidden="true"></svg>
          </span>
          <div>
            <h2 ngpDialogTitle class="text-base font-semibold">
              {{ 'groups.inviteDialog.title' | transloco }}
            </h2>
            <p ngpDialogDescription class="mt-1 text-sm leading-6 text-[var(--z-muted)]">
              {{ 'groups.inviteDialog.description' | transloco }}
            </p>
          </div>
        </div>

        @if (!invitation()) {
          <form class="mt-5 grid gap-4" (submit)="createInvitation($event)">
            <label class="grid gap-2">
              <z-field-label
                [label]="'common.fields.emailAddressOptional' | transloco"
                [control]="emailControl"
              />
              <z-text-input
                type="email"
                autocomplete="email"
                placeholder="student@example.com"
                [formControl]="emailControl"
                [invalid]="showEmailError()"
                ariaDescribedBy="invite-email-error"
              />
              @if (showEmailError()) {
                <z-field-error
                  id="invite-email-error"
                  [message]="'groups.inviteDialog.emailInvalid' | transloco"
                />
              }
            </label>

            <div class="rounded-md border border-[var(--z-border)] bg-[var(--z-bg)] p-4">
              <div class="flex items-start gap-3">
                <svg lucideMail class="mt-0.5 size-4 shrink-0 text-[var(--z-primary)]" aria-hidden="true"></svg>
                <p class="text-sm leading-6 text-[var(--z-muted)]">
                  {{ 'groups.inviteDialog.emailHint' | transloco }}
                </p>
              </div>
            </div>

            @if (errorMessage()) {
              <p class="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
                {{ errorMessage() }}
              </p>
            }

            <div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <z-button
                type="button"
                variant="secondary"
                [disabled]="status() === 'loading'"
                (pressed)="close()(false)"
              >
                {{ 'common.actions.cancel' | transloco }}
              </z-button>
              <z-button type="submit" [disabled]="emailControl.invalid || status() === 'loading'">
                @if (status() === 'loading') {
                  {{ 'groups.inviteDialog.creating' | transloco }}
                } @else {
                  {{ 'common.actions.createInvitation' | transloco }}
                }
              </z-button>
            </div>
          </form>
        } @else {
          <div class="mt-5 grid gap-4">
            <div
              class="grid gap-4 rounded-lg border border-[var(--z-border)] bg-[var(--z-bg)] p-4 sm:grid-cols-[10rem_minmax(0,1fr)]"
            >
              <div
                class="grid aspect-square place-items-center rounded-md border border-dashed border-[var(--z-border)] bg-white p-3"
              >
                @if (qrImageUrl(); as qrImageUrl) {
                  <img
                    class="size-full object-contain"
                    [src]="qrImageUrl"
                    [alt]="'groups.inviteDialog.qrAlt' | transloco"
                  />
                } @else if (qrStatus() === 'loading') {
                  <z-skeleton class="block size-full"></z-skeleton>
                } @else {
                  <div class="text-center text-[var(--z-muted)]">
                    <svg lucideQrCode class="mx-auto size-8" aria-hidden="true"></svg>
                    <p class="mt-2 text-xs">{{ 'groups.inviteDialog.qrUnavailable' | transloco }}</p>
                  </div>
                }
              </div>

              <div class="min-w-0">
                <div class="flex items-center gap-2 text-sm font-semibold">
                  <svg lucideLink class="size-4 text-[var(--z-primary)]" aria-hidden="true"></svg>
                  <span>{{ 'groups.inviteDialog.shareLink' | transloco }}</span>
                </div>
                <code
                  class="mt-3 block overflow-x-auto rounded-md border border-[var(--z-border)] bg-white px-3 py-2 text-xs text-[var(--z-muted)]"
                >
                  {{ inviteLink() }}
                </code>
                <p class="mt-3 text-sm leading-6 text-[var(--z-muted)]">
                  {{ 'groups.inviteDialog.shareHint' | transloco }}
                </p>
              </div>
            </div>

            <div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <z-button type="button" variant="secondary" (pressed)="copyLink()">
                <svg lucideCopy class="size-4" aria-hidden="true"></svg>
                <span>
                  {{ (linkCopied() ? 'common.actions.copied' : 'common.actions.copyLink') | transloco }}
                </span>
              </z-button>
              @if (qrImageUrl()) {
                <z-button type="button" variant="secondary" (pressed)="downloadQr()">
                  <svg lucideDownload class="size-4" aria-hidden="true"></svg>
                  <span>{{ 'common.actions.downloadQr' | transloco }}</span>
                </z-button>
              }
              <z-button type="button" (pressed)="close()(true)">
                {{ 'common.actions.done' | transloco }}
              </z-button>
            </div>
          </div>
        }
      </section>
    </div>
  `,
  styles: `
    :host {
      display: contents;
    }

    .z-dialog-overlay-enter {
      animation: z-dialog-overlay-in 120ms ease-out;
    }
    .z-dialog-overlay-leave {
      animation: z-dialog-overlay-out 100ms ease-in;
    }
    .z-dialog-panel-enter {
      animation: z-dialog-panel-in 140ms ease-out;
    }
    .z-dialog-panel-leave {
      animation: z-dialog-panel-out 100ms ease-in;
    }
    @keyframes z-dialog-overlay-in {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes z-dialog-overlay-out {
      from { opacity: 1; }
      to { opacity: 0; }
    }
    @keyframes z-dialog-panel-in {
      from { opacity: 0; transform: translateY(8px) scale(0.98); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }
    @keyframes z-dialog-panel-out {
      from { opacity: 1; transform: translateY(0) scale(1); }
      to { opacity: 0; transform: translateY(8px) scale(0.98); }
    }
  `,
})
export class GroupInvitationDialogComponent implements OnDestroy {
  readonly groupId = input.required<string>();
  readonly close = input.required<(result?: boolean) => void>();

  private readonly api = inject(GroupsApiClient);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly shell = inject(AppShellStore);
  private readonly transloco = inject(TranslocoService);

  protected readonly emailControl = new FormControl('', {
    nonNullable: true,
    validators: [Validators.email],
  });
  protected readonly errorMessage = signal('');
  protected readonly invitation = signal<GroupInvitation | null>(null);
  protected readonly linkCopied = signal(false);
  protected readonly qrImageUrl = signal<SafeUrl | null>(null);
  protected readonly qrStatus = signal<'idle' | 'loading' | 'success' | 'error'>('idle');
  protected readonly sentByEmail = signal(false);
  protected readonly status = signal<'idle' | 'loading' | 'success' | 'error'>('idle');
  protected readonly inviteLink = computed(() => {
    const invitation = this.invitation();

    return invitation ? `${window.location.origin}/groups?invite=${invitation.code}` : '';
  });

  private qrBlobUrl = '';

  ngOnDestroy(): void {
    this.revokeQrBlobUrl();
  }

  protected createInvitation(event?: SubmitEvent | Event): void {
    event?.preventDefault();

    if (this.emailControl.invalid || this.status() === 'loading') {
      this.emailControl.markAsDirty();
      return;
    }

    const email = this.emailControl.value.trim();
    this.status.set('loading');
    this.errorMessage.set('');

    this.api.createGroupInvitation(this.groupId(), email || undefined).subscribe({
      next: (invitation) => {
        this.invitation.set(invitation);
        this.sentByEmail.set(!!email);
        this.status.set('success');
        this.shell.showToast(
          this.transloco.translate('toast.successTitle'),
          this.transloco.translate(
            email ? 'groups.inviteDialog.sent' : 'groups.inviteDialog.linkCreated',
          ),
        );
        this.loadQrCode(invitation.id);
      },
      error: () => {
        this.status.set('error');
        this.errorMessage.set(this.transloco.translate('groups.inviteDialog.failed'));
      },
    });
  }

  protected showEmailError(): boolean {
    return this.emailControl.dirty && this.emailControl.invalid;
  }

  protected copyLink(): void {
    const link = this.inviteLink();
    if (!link) return;

    void this.writeClipboard(link).then(() => {
      this.linkCopied.set(true);
      this.shell.showToast(
        this.transloco.translate('toast.successTitle'),
        this.transloco.translate('groups.inviteDialog.linkCopied'),
      );
      setTimeout(() => this.linkCopied.set(false), 2000);
    });
  }

  protected downloadQr(): void {
    if (!this.qrBlobUrl) return;

    const link = document.createElement('a');
    link.href = this.qrBlobUrl;
    link.download = 'invitation-qr.png';
    link.click();
  }

  private loadQrCode(invitationId: string): void {
    this.qrStatus.set('loading');
    this.api.getGroupInvitationQrCode(this.groupId(), invitationId).subscribe({
      next: (blob) => {
        this.revokeQrBlobUrl();
        this.qrBlobUrl = URL.createObjectURL(blob);
        this.qrImageUrl.set(this.sanitizer.bypassSecurityTrustUrl(this.qrBlobUrl));
        this.qrStatus.set('success');
      },
      error: () => {
        this.qrStatus.set('error');
      },
    });
  }

  private async writeClipboard(value: string): Promise<void> {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return;
    }

    const textarea = document.createElement('textarea');
    textarea.value = value;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    document.body.append(textarea);
    textarea.select();
    document.execCommand('copy');
    textarea.remove();
  }

  private revokeQrBlobUrl(): void {
    if (!this.qrBlobUrl) return;

    URL.revokeObjectURL(this.qrBlobUrl);
    this.qrBlobUrl = '';
  }
}
