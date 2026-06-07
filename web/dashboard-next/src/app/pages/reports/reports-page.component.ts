import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { map } from 'rxjs';
import {
  LucideCalendarDays,
  LucideChartColumn,
  LucideChevronDown,
  LucideChevronLeft,
  LucideChevronRight,
  LucideClapperboard,
  LucideDownload,
  LucideUserRound,
  LucideUsers,
  LucideVideo,
} from '@lucide/angular';
import { ActivatedRoute } from '@angular/router';
import { DashboardDateTimeService } from '../../core/i18n/dashboard-date-time.service';
import { ReportEvent, ReportRole } from '../../core/http/reports-api.service';
import { AppShellStore } from '../../core/state/app-shell.store';
import { ReportsStore } from '../../features/reports/reports.store';
import {
  Granularity,
  ReportRowOptions,
  Totals,
  durationHM,
  quarterOf,
  reportRows,
  reportSections,
  videoClock,
} from '../../features/reports/reports.util';
import { buildReportDoc } from '../../features/reports/reports.pdf';
import { ZAvatarComponent } from '../../shared/ui/avatar/z-avatar.component';
import { ZBadgeComponent } from '../../shared/ui/badge/z-badge.component';
import { ZButtonComponent } from '../../shared/ui/button/z-button.component';
import { ZEmptyStateComponent } from '../../shared/ui/empty-state/z-empty-state.component';
import { ZSegmentedControlComponent } from '../../shared/ui/segmented-control/z-segmented-control.component';
import { ZSkeletonComponent } from '../../shared/ui/skeleton/z-skeleton.component';

@Component({
  selector: 'app-reports-page',
  imports: [
    TranslocoPipe,
    LucideCalendarDays,
    LucideChartColumn,
    LucideChevronDown,
    LucideChevronLeft,
    LucideChevronRight,
    LucideClapperboard,
    LucideDownload,
    LucideUserRound,
    LucideUsers,
    LucideVideo,
    ZAvatarComponent,
    ZBadgeComponent,
    ZButtonComponent,
    ZEmptyStateComponent,
    ZSegmentedControlComponent,
    ZSkeletonComponent,
  ],
  template: `
    <div class="mx-auto grid max-w-[1152px] gap-4">
      <!-- 1. Page-header card -->
      <section
        class="flex flex-wrap items-start gap-4 rounded-lg border border-[var(--z-border)] bg-white p-4 shadow-sm"
      >
        <span
          class="grid size-9 shrink-0 place-items-center rounded-md bg-[var(--z-surface-warm)] text-[var(--z-primary)]"
        >
          @if (isExpert()) {
            <svg lucideChartColumn class="size-5" aria-hidden="true"></svg>
          } @else {
            <svg lucideUserRound class="size-5" aria-hidden="true"></svg>
          }
        </span>
        <div class="min-w-0 flex-1">
          <h1 class="text-2xl font-bold tracking-tight sm:text-[28px]">
            {{ title() | transloco }}
          </h1>
          <p class="mt-1 text-sm text-[var(--z-muted)]">{{ description() }}</p>
        </div>
        <!-- Export -->
        <div class="relative">
          <z-button variant="secondary" size="sm" (pressed)="toggleMenu()">
            <svg lucideDownload class="size-4" aria-hidden="true"></svg>
            {{ 'reports.export.label' | transloco }}
            <svg lucideChevronDown class="size-4" aria-hidden="true"></svg>
          </z-button>
          @if (menuOpen()) {
            <button
              type="button"
              class="fixed inset-0 z-10 cursor-default"
              aria-hidden="true"
              (click)="closeMenu()"
            ></button>
            <div
              class="absolute right-0 z-20 mt-1 w-56 overflow-hidden rounded-md border border-[var(--z-border)] bg-white py-1 shadow-md"
              role="menu"
            >
              <button
                type="button"
                role="menuitem"
                class="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-[var(--z-surface-warm)]"
                (click)="exportCsv()"
              >
                {{ 'reports.export.csv' | transloco }}
              </button>
              <button
                type="button"
                role="menuitem"
                class="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-[var(--z-surface-warm)]"
                (click)="exportPdf()"
              >
                {{ 'reports.export.pdf' | transloco }}
              </button>
            </div>
          }
        </div>
      </section>

      @if (store.status() === 'loading') {
        <div class="grid gap-4" aria-hidden="true">
          <z-skeleton class="block h-12 w-full"></z-skeleton>
          <div class="grid grid-cols-1 gap-4 min-[921px]:grid-cols-3">
            <z-skeleton class="block h-24 w-full"></z-skeleton>
            <z-skeleton class="block h-24 w-full"></z-skeleton>
            <z-skeleton class="block h-24 w-full"></z-skeleton>
          </div>
          <z-skeleton class="block h-40 w-full"></z-skeleton>
        </div>
      } @else if (store.status() === 'error') {
        <z-empty-state
          [title]="'home.error.title' | transloco"
          [description]="store.error() || ('home.error.description' | transloco)"
        />
      } @else {
        <!-- 2. Period bar -->
        <div class="flex flex-wrap items-center gap-3.5">
          <z-segmented-control
            [label]="'reports.period.label' | transloco"
            [value]="store.gran()"
            [options]="granOptions()"
            (valueChange)="setGran($event)"
          />
          <div
            class="flex items-center gap-1 rounded-md border border-[var(--z-border)] bg-white p-1"
          >
            <button
              type="button"
              class="grid size-[34px] place-items-center rounded text-[var(--z-muted)] transition hover:bg-[var(--z-surface-warm)] hover:text-[var(--z-text)]"
              [attr.aria-label]="'reports.period.prev' | transloco"
              (click)="store.stepBack()"
            >
              <svg lucideChevronLeft class="size-4" aria-hidden="true"></svg>
            </button>
            <span
              class="flex min-w-[168px] items-center justify-center gap-2 text-sm font-semibold tabular-nums"
            >
              <svg lucideCalendarDays class="size-4 text-[var(--z-muted)]" aria-hidden="true"></svg>
              {{ periodLabel() }}
            </span>
            <button
              type="button"
              class="grid size-[34px] place-items-center rounded text-[var(--z-muted)] transition hover:bg-[var(--z-surface-warm)] hover:text-[var(--z-text)] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
              [attr.aria-label]="'reports.period.next' | transloco"
              [disabled]="!store.canStepForward()"
              (click)="store.stepForward()"
            >
              <svg lucideChevronRight class="size-4" aria-hidden="true"></svg>
            </button>
          </div>
          @if (!store.atCurrentPeriod()) {
            <button
              type="button"
              class="rounded-md px-3 py-2 text-sm font-semibold text-[var(--z-primary-strong)] transition hover:bg-[var(--z-surface-warm)]"
              (click)="store.resetToday()"
            >
              {{ 'reports.period.today' | transloco }}
            </button>
          }
        </div>

        <!-- 3. Stat cards -->
        <div class="grid grid-cols-1 gap-4 min-[921px]:grid-cols-3">
          <div
            class="flex items-center gap-3 rounded-lg border border-[var(--z-border)] bg-white p-3.5 shadow-sm"
          >
            <span
              class="grid size-11 shrink-0 place-items-center rounded-md bg-[var(--z-surface-warm)] text-[var(--z-primary-strong)]"
            >
              <svg lucideClapperboard class="size-5" aria-hidden="true"></svg>
            </span>
            <div class="min-w-0">
              <p class="text-[30px] font-semibold leading-none tracking-tight tabular-nums">
                {{ totals().videoCount }}
              </p>
              <p class="mt-1 text-[13px] text-[var(--z-muted)]">
                {{ 'reports.stats.videos' | transloco }}
              </p>
            </div>
            <z-badge class="ml-auto" tone="neutral">{{ fmtDuration(totals().videoSec) }}</z-badge>
          </div>
          <div
            class="flex items-center gap-3 rounded-lg border border-[var(--z-border)] bg-white p-3.5 shadow-sm"
          >
            <span
              class="grid size-11 shrink-0 place-items-center rounded-md border border-green-200 bg-green-50 text-[var(--z-success)]"
            >
              <svg lucideVideo class="size-5" aria-hidden="true"></svg>
            </span>
            <div class="min-w-0">
              <p class="text-[30px] font-semibold leading-none tracking-tight tabular-nums">
                {{ totals().liveCount }}
              </p>
              <p class="mt-1 text-[13px] text-[var(--z-muted)]">
                {{ 'reports.stats.live' | transloco }}
              </p>
            </div>
            <z-badge class="ml-auto" tone="success">{{ fmtDuration(totals().liveSec) }}</z-badge>
          </div>
          <div
            class="flex items-center gap-3 rounded-lg border border-[var(--z-border)] bg-white p-3.5 shadow-sm"
          >
            <span
              class="grid size-11 shrink-0 place-items-center rounded-md bg-[#eef2ff] text-[#4338ca]"
            >
              @if (isExpert()) {
                <svg lucideUsers class="size-5" aria-hidden="true"></svg>
              } @else {
                <svg lucideUserRound class="size-5" aria-hidden="true"></svg>
              }
            </span>
            <div class="min-w-0">
              <p class="text-[30px] font-semibold leading-none tracking-tight tabular-nums">
                {{ report().leafCount }}
              </p>
              <p class="mt-1 text-[13px] text-[var(--z-muted)]">{{ peopleLabel() }}</p>
            </div>
            <z-badge class="ml-auto" tone="neutral">{{ inGroupsLabel() }}</z-badge>
          </div>
        </div>

        <!-- 4. Report body — Accordion -->
        @if (report().count === 0) {
          <z-empty-state
            [title]="'reports.empty.title' | transloco"
            [description]="emptyDescription()"
          />
        } @else {
          <div class="grid gap-3.5">
            @for (group of report().groups; track group.id) {
              <div
                class="overflow-hidden rounded-lg border border-[var(--z-border)] bg-white shadow-sm"
              >
                <button
                  type="button"
                  class="flex w-full flex-wrap items-center gap-x-3 gap-y-2 px-4 py-[11px] text-left transition hover:bg-[var(--z-surface-warm)]"
                  [attr.aria-expanded]="isGroupOpen(group.id)"
                  (click)="toggleGroup(group.id)"
                >
                  <svg
                    lucideChevronRight
                    class="size-[18px] shrink-0 text-[var(--z-muted)] transition-transform"
                    [class.rotate-90]="isGroupOpen(group.id)"
                    [class.text-[var(--z-primary)]]="isGroupOpen(group.id)"
                    aria-hidden="true"
                  ></svg>
                  <span class="text-base font-semibold">{{ group.name }}</span>
                  <z-badge tone="neutral">{{ leafCountLabel(group.leaves.length) }}</z-badge>
                  <div
                    class="ml-auto flex w-full justify-end gap-2 max-[920px]:order-last min-[921px]:w-auto"
                  >
                    @if (group.totals.videoCount > 0) {
                      <span [class]="chipClass('video', false)">
                        <svg lucideClapperboard class="size-3.5" aria-hidden="true"></svg>
                        {{ videoChip(group.totals) }}
                      </span>
                    }
                    @if (group.totals.liveCount > 0) {
                      <span [class]="chipClass('live', false)">
                        <svg lucideVideo class="size-3.5" aria-hidden="true"></svg>
                        {{ liveChip(group.totals) }}
                      </span>
                    }
                  </div>
                </button>

                @if (isGroupOpen(group.id)) {
                  <div class="border-t border-[var(--z-border)]">
                    @for (leaf of group.leaves; track leaf.id) {
                      <div class="border-b border-[var(--z-border)] last:border-b-0">
                        <button
                          type="button"
                          class="flex w-full flex-wrap items-center gap-x-3 gap-y-2 py-2 pl-5 pr-4 text-left transition hover:bg-[var(--z-surface-warm)]"
                          [attr.aria-expanded]="isLeafOpen(group.id, leaf.id)"
                          (click)="toggleLeaf(group.id, leaf.id)"
                        >
                          <svg
                            lucideChevronRight
                            class="size-4 shrink-0 text-[var(--z-muted)] transition-transform"
                            [class.rotate-90]="isLeafOpen(group.id, leaf.id)"
                            aria-hidden="true"
                          ></svg>
                          <z-avatar
                            class="size-[30px] text-xs"
                            [fallback]="initials(leaf.name)"
                            [alt]="leaf.name"
                          />
                          <span class="text-sm font-semibold">{{ leaf.name }}</span>
                          <div
                            class="ml-auto flex w-full justify-end gap-2 max-[920px]:order-last min-[921px]:w-auto"
                          >
                            @if (leaf.totals.videoCount > 0) {
                              <span [class]="chipClass('video', true)">
                                <svg lucideClapperboard class="size-3.5" aria-hidden="true"></svg>
                                {{ videoChip(leaf.totals) }}
                              </span>
                            }
                            @if (leaf.totals.liveCount > 0) {
                              <span [class]="chipClass('live', true)">
                                <svg lucideVideo class="size-3.5" aria-hidden="true"></svg>
                                {{ liveChip(leaf.totals) }}
                              </span>
                            }
                          </div>
                        </button>

                        @if (isLeafOpen(group.id, leaf.id)) {
                          <div class="bg-[var(--z-bg)]">
                            @for (event of leaf.events; track $index) {
                              <div
                                class="flex items-center gap-3 border-t border-[var(--z-border)] py-[7px] pl-12 pr-4"
                              >
                                <span
                                  class="grid size-[30px] shrink-0 place-items-center rounded-md"
                                  [class]="
                                    event.kind === 'video'
                                      ? 'bg-[var(--z-surface-warm)] text-[var(--z-primary-strong)]'
                                      : 'bg-green-50 text-[var(--z-success)]'
                                  "
                                >
                                  @if (event.kind === 'video') {
                                    <svg lucideClapperboard class="size-4" aria-hidden="true"></svg>
                                  } @else {
                                    <svg lucideVideo class="size-4" aria-hidden="true"></svg>
                                  }
                                </span>
                                <div class="min-w-0 flex-1">
                                  <p class="truncate text-sm font-semibold">{{ event.title }}</p>
                                  <p class="text-xs text-[var(--z-muted)]">
                                    {{ eventMeta(event) }}
                                  </p>
                                </div>
                                <span
                                  class="min-w-16 text-right text-[13px] font-semibold tabular-nums"
                                >
                                  {{ eventDuration(event) }}
                                </span>
                              </div>
                            }
                          </div>
                        }
                      </div>
                    }
                  </div>
                }
              </div>
            }
          </div>
        }
      }
    </div>
  `,
})
export class ReportsPageComponent {
  protected readonly store = inject(ReportsStore);
  private readonly shell = inject(AppShellStore);
  private readonly dateTime = inject(DashboardDateTimeService);
  private readonly transloco = inject(TranslocoService);
  private readonly translationEvents = toSignal(this.transloco.events$, { initialValue: null });
  // True once the active language file is loaded. The label computeds below call
  // translate() synchronously; gating on this keeps them blank (rather than logging
  // "Missing translation") until the JSON is available, then re-runs them. We derive
  // it from selectTranslation(), which replays the cached load *synchronously* when
  // the language is already loaded — the usual case when navigating to this lazy
  // route — and re-emits on language change. (An earlier version waited for the
  // one-shot translationLoadSuccess event, which had typically already fired before
  // this page subscribed, leaving the signal stuck at false and every gated label
  // permanently empty.)
  private readonly translationsReady = toSignal(
    this.transloco.selectTranslation().pipe(map(() => true)),
    { initialValue: false },
  );

  protected readonly report = this.store.report;
  protected readonly totals = computed(() => this.report().totals);
  protected readonly isExpert = computed(() => this.report().role === 'expert');

  private readonly menuOpenSig = signal(false);
  protected readonly menuOpen = this.menuOpenSig.asReadonly();
  // Per-node open overrides keyed by "g:<id>" / "l:<gid>:<lid>". Absent keys fall
  // back to the default-open rule (first group, its first leaf).
  private readonly overrides = signal<Map<string, boolean>>(new Map());

  protected readonly title = computed(() =>
    this.isExpert() ? 'reports.expert.title' : 'reports.student.title',
  );

  protected readonly granOptions = computed(() => {
    const ready = this.translationsReady();
    return (['month', 'quarter', 'year'] as Granularity[]).map((value) => ({
      value,
      label: ready ? this.transloco.translate(`reports.period.${value}`) : '',
    }));
  });

  protected readonly periodLabel = computed(() => {
    this.translationEvents();
    const gran = this.store.gran();
    const cursor = this.store.cursor();
    if (gran === 'year') return `${cursor.year}`;
    if (gran === 'quarter') return `Q${quarterOf(cursor.month) + 1} ${cursor.year}`;
    const iso = `${cursor.year}-${String(cursor.month + 1).padStart(2, '0')}-01`;
    return this.dateTime.formatCalendarDate(iso, { month: 'long', year: 'numeric' });
  });

  protected readonly description = computed(() => {
    if (!this.translationsReady()) return '';
    return this.transloco.translate('reports.description', {
      kind: this.transloco.translate(`reports.kind.${this.store.gran()}`),
      name: this.store.viewer()?.name ?? '',
      count: this.report().count,
      leaf: this.transloco.translate(
        this.isExpert() ? 'reports.leaf.student' : 'reports.leaf.expert',
      ),
    });
  });

  protected readonly peopleLabel = computed(() => {
    if (!this.translationsReady()) return '';
    return this.transloco.translate(
      this.isExpert() ? 'reports.stats.students' : 'reports.stats.experts',
    );
  });

  protected readonly inGroupsLabel = computed(() => {
    if (!this.translationsReady()) return '';
    return this.transloco.translate('reports.stats.inGroups', { count: this.report().groupCount });
  });

  protected readonly emptyDescription = computed(() => {
    if (!this.translationsReady()) return '';
    return this.transloco.translate('reports.empty.description', { period: this.periodLabel() });
  });

  constructor() {
    const route = inject(ActivatedRoute);
    const role = route.snapshot.data['role'] as ReportRole | undefined;
    if (role) this.store.setRole(role);
    // Refetch on every visit so the report reflects activity added since last time.
    void this.store.load();
  }

  protected setGran(value: string): void {
    if (value === 'month' || value === 'quarter' || value === 'year') {
      this.store.setGran(value);
    }
  }

  protected toggleMenu(): void {
    this.menuOpenSig.update((v) => !v);
  }

  protected closeMenu(): void {
    this.menuOpenSig.set(false);
  }

  // ── Accordion open state ──
  protected isGroupOpen(groupId: string): boolean {
    const o = this.overrides().get(`g:${groupId}`);
    return o ?? this.report().groups[0]?.id === groupId;
  }

  protected isLeafOpen(groupId: string, leafId: string): boolean {
    const o = this.overrides().get(`l:${groupId}:${leafId}`);
    if (o !== undefined) return o;
    const firstGroup = this.report().groups[0];
    return firstGroup?.id === groupId && firstGroup.leaves[0]?.id === leafId;
  }

  protected toggleGroup(groupId: string): void {
    this.setOverride(`g:${groupId}`, !this.isGroupOpen(groupId));
  }

  protected toggleLeaf(groupId: string, leafId: string): void {
    this.setOverride(`l:${groupId}:${leafId}`, !this.isLeafOpen(groupId, leafId));
  }

  private setOverride(key: string, value: boolean): void {
    const next = new Map(this.overrides());
    next.set(key, value);
    this.overrides.set(next);
  }

  // ── Chips & labels ──
  protected chipClass(kind: 'video' | 'live', mute: boolean): string {
    const base =
      'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-semibold';
    if (mute) return `${base} border-[var(--z-border)] bg-white text-[var(--z-muted)]`;
    if (kind === 'video') {
      return `${base} border-[var(--z-primary-soft)] bg-[var(--z-surface-warm)] text-[var(--z-primary-strong)]`;
    }
    return `${base} border-green-200 bg-green-50 text-[var(--z-success)]`;
  }

  protected videoChip(t: Totals): string {
    this.translationEvents();
    const noun = this.transloco.translate(
      t.videoCount === 1 ? 'reports.unit.video' : 'reports.unit.videos',
    );
    return `${t.videoCount} ${noun} · ${this.fmtDuration(t.videoSec)}`;
  }

  protected liveChip(t: Totals): string {
    this.translationEvents();
    const noun = this.transloco.translate(
      t.liveCount === 1 ? 'reports.unit.live' : 'reports.unit.lives',
    );
    return `${t.liveCount} ${noun} · ${this.fmtDuration(t.liveSec)}`;
  }

  protected leafCountLabel(count: number): string {
    this.translationEvents();
    return this.transloco.translate(
      this.isExpert() ? 'reports.leafCount.students' : 'reports.leafCount.experts',
      { count },
    );
  }

  protected fmtDuration(totalSec: number): string {
    this.translationEvents();
    const { hours, minutes } = durationHM(totalSec);
    const h = this.transloco.translate('reports.unit.hour');
    const m = this.transloco.translate('reports.unit.minute');
    if (hours && minutes) return `${hours} ${h} ${minutes} ${m}`;
    if (hours) return `${hours} ${h}`;
    return `${minutes} ${m}`;
  }

  protected eventDuration(event: ReportEvent): string {
    this.translationEvents();
    const m = this.transloco.translate('reports.unit.minute');
    if (event.kind === 'video') return `${videoClock(event.duration_seconds)} ${m}`;
    return `${Math.round(event.duration_seconds / 60)} ${m}`;
  }

  protected eventMeta(event: ReportEvent): string {
    this.translationEvents();
    const prefix = this.transloco.translate(
      event.kind === 'video' ? 'reports.event.videoUploaded' : 'reports.event.liveCoaching',
    );
    const date = this.dateTime.formatInstantDate(event.at, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
    const time = this.dateTime.formatInstantTime(event.at, { hour: '2-digit', minute: '2-digit' });
    return `${prefix} · ${date} · ${time}`;
  }

  protected initials(name: string): string {
    return name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? '')
      .join('');
  }

  // ── Export helpers (shared by CSV + PDF) ──
  private reportRowOptions(): ReportRowOptions {
    return {
      videoLabel: this.transloco.translate('reports.unit.video'),
      liveLabel: this.transloco.translate('reports.unit.live'),
      formatDate: (iso) =>
        this.dateTime.formatInstantDate(iso, { day: '2-digit', month: '2-digit', year: 'numeric' }),
    };
  }

  private exportColumns(): string[] {
    return [
      this.transloco.translate('reports.columns.group'),
      this.transloco.translate(this.isExpert() ? 'reports.leaf.student' : 'reports.leaf.expert'),
      this.transloco.translate('reports.columns.date'),
      this.transloco.translate('reports.columns.type'),
      this.transloco.translate('reports.columns.description'),
      this.transloco.translate('reports.columns.minutes'),
    ];
  }

  private exportFileName(extension: 'csv' | 'pdf'): string {
    const prefix = this.transloco.translate('reports.export.fileName');
    return `${prefix}_${this.store.viewer()?.name ?? 'report'}_${this.periodLabel()}.${extension}`;
  }

  // Aggregated total length across all events, formatted like the stat cards.
  private exportTotalLength(): string {
    const totals = this.report().totals;
    return this.fmtDuration(totals.videoSec + totals.liveSec);
  }

  // Trailing totals row for the flat CSV export: label + aggregated length.
  private exportSummaryRow(): string[] {
    return [
      this.transloco.translate('reports.export.total'),
      '',
      '',
      '',
      '',
      this.exportTotalLength(),
    ];
  }

  // The 4 event-table headers for the grouped PDF (no group/expert columns).
  private exportEventColumns(): string[] {
    return [
      this.transloco.translate('reports.columns.date'),
      this.transloco.translate('reports.columns.type'),
      this.transloco.translate('reports.columns.description'),
      this.transloco.translate('reports.columns.minutes'),
    ];
  }

  // Plain-text KPI line for the PDF header: videos · live · people.
  private exportKpiLine(): string {
    const report = this.report();
    return [
      this.videoChip(report.totals),
      this.liveChip(report.totals),
      this.leafCountLabel(report.leafCount),
    ].join('   |   ');
  }

  // Right-aligned per-section subtotal, reusing the dashboard chip wording.
  private exportLeafSummary(totals: Totals): string {
    const parts: string[] = [];
    if (totals.videoCount) parts.push(this.videoChip(totals));
    if (totals.liveCount) parts.push(this.liveChip(totals));
    return parts.length ? parts.join(' · ') : this.fmtDuration(0);
  }

  // ── CSV export ──
  protected exportCsv(): void {
    this.closeMenu();
    const rows = [
      this.exportColumns(),
      ...reportRows(this.report(), this.reportRowOptions()),
      this.exportSummaryRow(),
    ];
    const csv =
      '﻿' +
      rows
        .map((row) => row.map((value) => `"${value.replace(/"/g, '""')}"`).join(';'))
        .join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = this.exportFileName('csv');
    link.click();
    URL.revokeObjectURL(url);

    this.shell.showToast(
      this.transloco.translate('reports.export.toastTitle'),
      this.transloco.translate('reports.export.toastMessage', {
        count: this.report().count,
        period: this.periodLabel(),
      }),
      'success',
    );
  }

  // ── PDF export ──
  protected async exportPdf(): Promise<void> {
    this.closeMenu();
    const sections = reportSections(this.report(), {
      videoLabel: this.transloco.translate('reports.unit.video'),
      liveLabel: this.transloco.translate('reports.unit.live'),
      formatDate: (iso) =>
        this.dateTime.formatInstantDate(iso, { day: '2-digit', month: '2-digit', year: 'numeric' }),
      formatSubtotal: (totals) => this.exportLeafSummary(totals),
    });
    const doc = buildReportDoc({
      title: this.transloco.translate(this.title()),
      subtitle: `${this.store.viewer()?.name ?? ''} · ${this.periodLabel()}`,
      kpiLine: this.exportKpiLine(),
      columns: this.exportEventColumns(),
      sections,
      total: {
        label: this.transloco.translate('reports.export.total'),
        value: this.exportTotalLength(),
      },
    });

    try {
      // Lazy-loaded so pdfmake (+ its fonts) never enters the main bundle.
      const pdfMake = (await import('pdfmake/build/pdfmake')).default;
      const pdfFontsModule = await import('pdfmake/build/vfs_fonts');
      const pdfFonts = (pdfFontsModule as { default?: unknown }).default ?? pdfFontsModule;
      // VFS layout varies by pdfmake version: older builds wrap it in
      // `.pdfMake.vfs` / `.vfs`; 0.2.x exports the font map (keys like
      // "Roboto-Regular.ttf") directly as the module object.
      const vfs =
        (pdfFonts as { pdfMake?: { vfs: unknown } }).pdfMake?.vfs ??
        (pdfFonts as { vfs?: unknown }).vfs ??
        pdfFonts;
      if (!vfs || typeof vfs !== 'object') {
        throw new Error('pdfmake VFS could not be loaded');
      }
      (pdfMake as unknown as { vfs: unknown }).vfs = vfs;

      pdfMake.createPdf(doc).download(this.exportFileName('pdf'));
    } catch (error) {
      // Loading pdfmake or rendering can fail; surface it instead of failing silently.
      console.error('reports_pdf_export_failed', error);
      this.shell.showToast(
        this.transloco.translate('reports.export.errorTitle'),
        this.transloco.translate('reports.export.errorMessage'),
        'error',
      );
      return;
    }

    this.shell.showToast(
      this.transloco.translate('reports.export.pdfToastTitle'),
      this.transloco.translate('reports.export.toastMessage', {
        count: this.report().count,
        period: this.periodLabel(),
      }),
      'success',
    );
  }
}
