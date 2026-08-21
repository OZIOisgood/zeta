import { NgClass } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import {
  LucideInbox,
  LucideMailOpen,
  LucidePaperclip,
  LucideRefreshCw,
  LucideSend,
} from '@lucide/angular';
import { firstValueFrom } from 'rxjs';
import {
  AdminEmailApiClient,
  AdminEmailDetail,
  AdminEmailHandlingStatus,
  AdminEmailInbox,
  AdminEmailSummary,
} from '../../core/http/admin-email-api.service';
import { DashboardDateTimeService } from '../../core/i18n/dashboard-date-time.service';
import { PermissionsService } from '../../core/permissions/permissions.service';
import { AppShellStore } from '../../core/state/app-shell.store';
import { ZBadgeComponent } from '../../shared/ui/badge/z-badge.component';
import { ZButtonComponent } from '../../shared/ui/button/z-button.component';
import { ZEmptyStateComponent } from '../../shared/ui/empty-state/z-empty-state.component';
import { SelectOption, ZSelectComponent } from '../../shared/ui/select/z-select.component';
import { ZSkeletonComponent } from '../../shared/ui/skeleton/z-skeleton.component';
import { ZTextareaComponent } from '../../shared/ui/textarea/z-textarea.component';

type AsyncStatus = 'idle' | 'loading' | 'success' | 'error';

@Component({
  selector: 'app-admin-email-page',
  imports: [
    FormsModule,
    NgClass,
    TranslocoPipe,
    ZBadgeComponent,
    ZButtonComponent,
    ZEmptyStateComponent,
    ZSelectComponent,
    ZSkeletonComponent,
    ZTextareaComponent,
    LucideInbox,
    LucideMailOpen,
    LucidePaperclip,
    LucideRefreshCw,
    LucideSend,
  ],
  template: `
    <div class="grid gap-5">
      <section class="border-b border-[var(--z-border)] pb-4">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div class="min-w-0">
            <div class="flex items-center gap-2">
              <svg lucideInbox class="size-5 text-[var(--z-primary)]" aria-hidden="true"></svg>
              <h1 class="text-xl font-semibold leading-tight">
                {{ 'adminEmail.title' | transloco }}
              </h1>
            </div>
            <p class="mt-1 text-sm leading-6 text-[var(--z-muted)]">
              {{ 'adminEmail.description' | transloco }}
            </p>
          </div>
          <z-button
            variant="secondary"
            size="sm"
            [disabled]="listStatus() === 'loading'"
            (pressed)="loadList()"
          >
            <svg lucideRefreshCw class="size-4" aria-hidden="true"></svg>
            {{ 'adminEmail.refresh' | transloco }}
          </z-button>
        </div>
      </section>

      <section class="grid gap-3 sm:grid-cols-2 lg:grid-cols-[16rem_16rem_auto] lg:items-end">
        <label class="grid gap-1.5">
          <span class="text-sm font-semibold">{{ 'adminEmail.filters.inbox' | transloco }}</span>
          <z-select
            [value]="inboxFilter()"
            [options]="inboxOptions()"
            (valueChange)="setInboxFilter($event)"
          />
        </label>
        <label class="grid gap-1.5">
          <span class="text-sm font-semibold">{{ 'adminEmail.filters.status' | transloco }}</span>
          <z-select
            [value]="statusFilter()"
            [options]="statusFilterOptions()"
            (valueChange)="setStatusFilter($event)"
          />
        </label>
        <p class="text-sm text-[var(--z-muted)] lg:pb-3">
          {{ 'adminEmail.total' | transloco: { count: total() } }}
        </p>
      </section>

      @if (listStatus() === 'loading') {
        <div class="grid gap-4 lg:grid-cols-[22rem_minmax(0,1fr)]" aria-hidden="true">
          <div class="grid gap-2">
            <z-skeleton class="block h-24 w-full"></z-skeleton>
            <z-skeleton class="block h-24 w-full"></z-skeleton>
            <z-skeleton class="block h-24 w-full"></z-skeleton>
          </div>
          <z-skeleton class="block h-[34rem] w-full"></z-skeleton>
        </div>
      } @else if (listStatus() === 'error') {
        <z-empty-state
          [title]="'adminEmail.errors.listTitle' | transloco"
          [description]="'adminEmail.errors.listDescription' | transloco"
        />
      } @else if (emails().length === 0) {
        <z-empty-state
          [title]="'adminEmail.empty.title' | transloco"
          [description]="'adminEmail.empty.description' | transloco"
        />
      } @else {
        <div
          class="grid min-h-[34rem] overflow-hidden rounded-lg border border-[var(--z-border)] bg-white shadow-sm lg:grid-cols-[22rem_minmax(0,1fr)]"
        >
          <section
            class="border-b border-[var(--z-border)] lg:border-b-0 lg:border-r"
            [attr.aria-label]="'adminEmail.messageList' | transloco"
          >
            <div class="max-h-[38rem] divide-y divide-[var(--z-border)] overflow-y-auto">
              @for (email of emails(); track email.id) {
                <button
                  type="button"
                  class="block w-full px-4 py-3 text-left transition hover:bg-[var(--z-surface-warm)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-[var(--z-primary)]"
                  [ngClass]="selectedId() === email.id ? 'bg-[var(--z-surface-warm)]' : 'bg-white'"
                  [attr.aria-current]="selectedId() === email.id ? 'true' : null"
                  (click)="openEmail(email)"
                >
                  <span class="flex items-start justify-between gap-2">
                    <span
                      class="min-w-0 truncate text-sm"
                      [ngClass]="email.read_at ? 'font-medium' : 'font-bold'"
                    >
                      {{ email.sender_name || email.sender }}
                    </span>
                    @if (!email.read_at) {
                      <span
                        class="mt-1 size-2 shrink-0 rounded-full bg-[var(--z-primary)]"
                        [attr.aria-label]="'adminEmail.unread' | transloco"
                      ></span>
                    }
                  </span>
                  <span class="mt-1 block truncate text-sm font-semibold">{{ email.subject }}</span>
                  <span class="mt-1 line-clamp-2 text-xs leading-5 text-[var(--z-muted)]">{{
                    email.preview
                  }}</span>
                  <span class="mt-2 flex flex-wrap items-center gap-2">
                    <z-badge>{{ inboxLabel(email.inbox) }}</z-badge>
                    <z-badge [tone]="statusTone(email.handling_status)">{{
                      statusLabel(email.handling_status)
                    }}</z-badge>
                    @if (email.attachment_count > 0) {
                      <span class="inline-flex items-center gap-1 text-xs text-[var(--z-muted)]">
                        <svg lucidePaperclip class="size-3.5" aria-hidden="true"></svg
                        >{{ email.attachment_count }}
                      </span>
                    }
                    <span class="ml-auto text-xs text-[var(--z-muted)]">{{
                      formatDate(email.received_at)
                    }}</span>
                  </span>
                </button>
              }
            </div>
          </section>

          <section class="min-w-0">
            @if (detailStatus() === 'loading') {
              <div class="grid gap-4 p-5" aria-hidden="true">
                <z-skeleton class="block h-16 w-full"></z-skeleton>
                <z-skeleton class="block h-48 w-full"></z-skeleton>
                <z-skeleton class="block h-32 w-full"></z-skeleton>
              </div>
            } @else if (detailStatus() === 'error') {
              <div class="p-5">
                <z-empty-state
                  [title]="'adminEmail.errors.detailTitle' | transloco"
                  [description]="'adminEmail.errors.detailDescription' | transloco"
                />
              </div>
            } @else if (selectedEmail(); as email) {
              <div class="grid gap-5 p-4 sm:p-5">
                <header class="grid gap-3 border-b border-[var(--z-border)] pb-4">
                  <div class="flex flex-wrap items-start justify-between gap-3">
                    <div class="min-w-0">
                      <h2 class="break-words text-lg font-semibold">{{ email.subject }}</h2>
                      <p class="mt-1 break-all text-sm text-[var(--z-muted)]">
                        {{ email.sender }} → {{ email.inbox_address }}
                      </p>
                    </div>
                    @if (canReply()) {
                      <label class="grid min-w-40 gap-1.5">
                        <span class="text-xs font-semibold text-[var(--z-muted)]">{{
                          'adminEmail.status' | transloco
                        }}</span>
                        <z-select
                          [value]="email.handling_status"
                          [options]="statusOptions()"
                          [disabled]="updatingStatus()"
                          (valueChange)="changeStatus($event)"
                        />
                      </label>
                    }
                  </div>
                  <p class="text-xs text-[var(--z-muted)]">
                    {{ formatLongDate(email.received_at) }}
                  </p>
                </header>

                <article class="whitespace-pre-wrap break-words text-sm leading-7">
                  {{ email.body_text }}
                </article>

                @if (email.attachments.length > 0) {
                  <section class="grid gap-2">
                    <h3 class="text-sm font-semibold">
                      {{ 'adminEmail.attachments' | transloco }}
                    </h3>
                    <div class="flex flex-wrap gap-2">
                      @for (attachment of email.attachments; track attachment.id) {
                        <a
                          class="inline-flex min-h-10 items-center gap-2 rounded-md border border-[var(--z-border)] bg-white px-3 text-sm font-semibold transition hover:bg-[var(--z-surface-warm)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--z-primary)]"
                          [href]="attachmentUrl(email.id, attachment.id)"
                          target="_blank"
                          rel="noopener"
                        >
                          <svg lucidePaperclip class="size-4" aria-hidden="true"></svg>
                          {{ attachment.filename || ('adminEmail.unnamedAttachment' | transloco) }}
                          @if (attachment.size) {
                            <span class="font-normal text-[var(--z-muted)]">{{
                              formatBytes(attachment.size)
                            }}</span>
                          }
                        </a>
                      }
                    </div>
                  </section>
                }

                @if (email.replies.length > 0) {
                  <section class="grid gap-3 border-t border-[var(--z-border)] pt-4">
                    <h3 class="text-sm font-semibold">{{ 'adminEmail.replies' | transloco }}</h3>
                    @for (reply of email.replies; track reply.id) {
                      <article class="rounded-md bg-[var(--z-surface-warm)] p-4">
                        <div
                          class="flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--z-muted)]"
                        >
                          <span>{{ reply.sender_display_name }} · {{ reply.from_address }}</span>
                          <span>{{ formatLongDate(reply.sent_at || reply.created_at) }}</span>
                        </div>
                        <p class="mt-3 whitespace-pre-wrap break-words text-sm leading-6">
                          {{ reply.body_text }}
                        </p>
                        @if (reply.delivery_status === 'failed') {
                          <p class="mt-2 text-xs font-semibold text-[var(--z-danger)]">
                            {{ 'adminEmail.replyFailed' | transloco }}
                          </p>
                        }
                      </article>
                    }
                  </section>
                }

                @if (canReply() && email.handling_status !== 'closed') {
                  <form
                    class="grid gap-3 border-t border-[var(--z-border)] pt-4"
                    (submit)="sendReply($event)"
                  >
                    <div>
                      <h3 class="text-sm font-semibold">
                        {{ 'adminEmail.compose.title' | transloco }}
                      </h3>
                      <p class="mt-1 text-xs text-[var(--z-muted)]">
                        {{
                          'adminEmail.compose.from' | transloco: { address: email.inbox_address }
                        }}
                      </p>
                    </div>
                    <z-textarea
                      name="replyBody"
                      [placeholder]="'adminEmail.compose.placeholder' | transloco"
                      [rows]="7"
                      [disabled]="sending()"
                      [(ngModel)]="replyBody"
                    />
                    @if (sendError()) {
                      <p class="text-sm font-semibold text-[var(--z-danger)]">
                        {{ 'adminEmail.errors.sendDescription' | transloco }}
                      </p>
                    }
                    <div class="flex justify-end">
                      <z-button type="submit" [disabled]="sending() || !replyBody.trim()">
                        <svg lucideSend class="size-4" aria-hidden="true"></svg>
                        {{
                          (sending() ? 'adminEmail.compose.sending' : 'adminEmail.compose.send')
                            | transloco
                        }}
                      </z-button>
                    </div>
                  </form>
                } @else if (email.handling_status === 'closed') {
                  <div
                    class="flex items-center gap-2 rounded-md bg-[var(--z-surface-warm)] p-3 text-sm text-[var(--z-muted)]"
                  >
                    <svg lucideMailOpen class="size-4" aria-hidden="true"></svg>
                    {{ 'adminEmail.closedMessage' | transloco }}
                  </div>
                }
              </div>
            }
          </section>
        </div>
      }
    </div>
  `,
})
export class AdminEmailPageComponent {
  private readonly api = inject(AdminEmailApiClient);
  private readonly dateTime = inject(DashboardDateTimeService);
  private readonly permissions = inject(PermissionsService);
  private readonly shell = inject(AppShellStore);
  private readonly transloco = inject(TranslocoService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly listStatus = signal<AsyncStatus>('idle');
  protected readonly detailStatus = signal<AsyncStatus>('idle');
  protected readonly emails = signal<AdminEmailSummary[]>([]);
  protected readonly total = signal(0);
  protected readonly selectedId = signal<string | null>(null);
  protected readonly selectedEmail = signal<AdminEmailDetail | null>(null);
  protected readonly inboxFilter = signal<AdminEmailInbox | ''>('');
  protected readonly statusFilter = signal<AdminEmailHandlingStatus | ''>('');
  protected readonly sending = signal(false);
  protected readonly sendError = signal(false);
  protected readonly updatingStatus = signal(false);
  protected readonly canReply = computed(() =>
    this.permissions.hasPermission('inbound-email:reply'),
  );
  protected replyBody = '';
  private replyIdempotencyKey: string | null = null;

  protected readonly inboxOptions = computed<SelectOption[]>(() => [
    { value: '', label: this.transloco.translate('adminEmail.filters.allInboxes') },
    { value: 'support', label: this.inboxLabel('support') },
    { value: 'social', label: this.inboxLabel('social') },
    { value: 'dsa', label: this.inboxLabel('dsa') },
  ]);
  protected readonly statusOptions = computed<SelectOption[]>(() => [
    { value: 'open', label: this.statusLabel('open') },
    { value: 'replied', label: this.statusLabel('replied') },
    { value: 'closed', label: this.statusLabel('closed') },
  ]);
  protected readonly statusFilterOptions = computed<SelectOption[]>(() => [
    { value: '', label: this.transloco.translate('adminEmail.filters.allStatuses') },
    ...this.statusOptions(),
  ]);

  constructor() {
    const routeInbox = this.router.url.startsWith('/admin/support')
      ? 'support'
      : this.route.snapshot.queryParamMap.get('inbox');
    if (this.isInbox(routeInbox)) this.inboxFilter.set(routeInbox);
    const routeStatus = this.route.snapshot.queryParamMap.get('status');
    if (this.isStatus(routeStatus)) this.statusFilter.set(routeStatus);
    void this.loadList();
  }

  protected async loadList(): Promise<void> {
    this.listStatus.set('loading');
    try {
      const response = await firstValueFrom(
        this.api.list({ inbox: this.inboxFilter(), status: this.statusFilter() }),
      );
      this.emails.set(response.items);
      this.total.set(response.total);
      this.listStatus.set('success');
      const selected =
        response.items.find((email) => email.id === this.selectedId()) ?? response.items[0];
      if (selected) {
        await this.openEmail(selected);
      } else {
        this.selectedId.set(null);
        this.selectedEmail.set(null);
        this.detailStatus.set('idle');
      }
    } catch {
      this.listStatus.set('error');
    }
  }

  protected async openEmail(email: AdminEmailSummary): Promise<void> {
    this.selectedId.set(email.id);
    this.detailStatus.set('loading');
    this.sendError.set(false);
    this.replyIdempotencyKey = null;
    try {
      const detail = await firstValueFrom(this.api.get(email.id));
      this.selectedEmail.set(detail);
      this.detailStatus.set('success');
      if (!detail.read_at && this.canReply()) {
        const updated = await firstValueFrom(this.api.update(email.id, { mark_read: true }));
        this.replaceSummary(updated);
        this.selectedEmail.update((current) =>
          current ? { ...current, read_at: updated.read_at } : current,
        );
      }
    } catch {
      this.detailStatus.set('error');
    }
  }

  protected setInboxFilter(value: string): void {
    if (value === '' || this.isInbox(value)) {
      this.inboxFilter.set(value);
      this.selectedId.set(null);
      void this.loadList();
    }
  }

  protected setStatusFilter(value: string): void {
    if (value === '' || this.isStatus(value)) {
      this.statusFilter.set(value);
      this.selectedId.set(null);
      void this.loadList();
    }
  }

  protected async changeStatus(value: string): Promise<void> {
    const email = this.selectedEmail();
    if (!email || !this.isStatus(value) || value === email.handling_status) return;
    this.updatingStatus.set(true);
    try {
      const updated = await firstValueFrom(this.api.update(email.id, { status: value }));
      this.replaceSummary(updated);
      this.selectedEmail.update((current) =>
        current
          ? { ...current, handling_status: updated.handling_status, read_at: updated.read_at }
          : current,
      );
      this.shell.showToast(
        this.transloco.translate('adminEmail.toast.statusTitle'),
        this.transloco.translate('adminEmail.toast.statusDescription'),
        'success',
      );
    } catch {
      this.shell.showToast(
        this.transloco.translate('adminEmail.toast.errorTitle'),
        this.transloco.translate('adminEmail.errors.statusDescription'),
        'error',
      );
    } finally {
      this.updatingStatus.set(false);
    }
  }

  protected async sendReply(event: Event): Promise<void> {
    event.preventDefault();
    const email = this.selectedEmail();
    const body = this.replyBody.trim();
    if (!email || !body || this.sending()) return;
    this.sending.set(true);
    this.sendError.set(false);
    this.replyIdempotencyKey ??= createIdempotencyKey();
    try {
      await firstValueFrom(this.api.reply(email.id, body, this.replyIdempotencyKey));
      this.replyBody = '';
      this.replyIdempotencyKey = null;
      this.shell.showToast(
        this.transloco.translate('adminEmail.toast.sentTitle'),
        this.transloco.translate('adminEmail.toast.sentDescription', { address: email.sender }),
        'success',
      );
      await this.loadList();
    } catch {
      this.sendError.set(true);
      this.shell.showToast(
        this.transloco.translate('adminEmail.toast.errorTitle'),
        this.transloco.translate('adminEmail.errors.sendDescription'),
        'error',
      );
    } finally {
      this.sending.set(false);
    }
  }

  protected attachmentUrl(emailId: string, attachmentId: string): string {
    return this.api.attachmentUrl(emailId, attachmentId);
  }

  protected inboxLabel(value: AdminEmailInbox): string {
    return this.transloco.translate(`adminEmail.inboxes.${value}`);
  }

  protected statusLabel(value: AdminEmailHandlingStatus): string {
    return this.transloco.translate(`adminEmail.statuses.${value}`);
  }

  protected statusTone(value: AdminEmailHandlingStatus): 'primary' | 'success' | 'neutral' {
    if (value === 'replied') return 'success';
    if (value === 'open') return 'primary';
    return 'neutral';
  }

  protected formatDate(value: string): string {
    return this.dateTime.formatInstantDateTime(value, { dateStyle: 'short' });
  }

  protected formatLongDate(value: string): string {
    return this.dateTime.formatInstantDateTime(value, { dateStyle: 'medium', timeStyle: 'short' });
  }

  protected formatBytes(size: number): string {
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KiB`;
    return `${(size / (1024 * 1024)).toFixed(1)} MiB`;
  }

  private replaceSummary(updated: AdminEmailSummary): void {
    this.emails.update((emails) =>
      emails.map((email) => (email.id === updated.id ? { ...email, ...updated } : email)),
    );
  }

  private isInbox(value: string | null): value is AdminEmailInbox {
    return value === 'support' || value === 'social' || value === 'dsa';
  }

  private isStatus(value: string | null): value is AdminEmailHandlingStatus {
    return value === 'open' || value === 'replied' || value === 'closed';
  }
}

function createIdempotencyKey(): string {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (character) => {
    const random = Math.floor(Math.random() * 16);
    const value = character === 'x' ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}
