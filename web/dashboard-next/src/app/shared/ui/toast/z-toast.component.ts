import { NgClass } from '@angular/common';
import { Component, computed, input, output } from '@angular/core';
import { LucideCircleAlert, LucideCircleCheck, LucideInfo, LucideX } from '@lucide/angular';
import { ZIconButtonComponent } from '../icon-button/z-icon-button.component';

type ToastType = 'success' | 'error' | 'info';

@Component({
  selector: 'z-toast',
  imports: [
    NgClass,
    LucideCircleAlert,
    LucideCircleCheck,
    LucideInfo,
    LucideX,
    ZIconButtonComponent,
  ],
  template: `
    <aside
      class="rounded-lg border bg-white p-4 shadow-lg shadow-orange-950/10"
      [ngClass]="toneClasses()"
      role="status"
      aria-live="polite"
    >
      <div class="flex items-start gap-3">
        <span
          class="mt-0.5 grid size-8 shrink-0 place-items-center rounded-md"
          [ngClass]="iconClasses()"
          aria-hidden="true"
        >
          @switch (type()) {
            @case ('success') {
              <svg lucideCircleCheck class="size-5"></svg>
            }
            @case ('error') {
              <svg lucideCircleAlert class="size-5"></svg>
            }
            @default {
              <svg lucideInfo class="size-5"></svg>
            }
          }
        </span>
        <div class="min-w-0 flex-1">
          <h2 class="text-sm font-semibold">{{ title() }}</h2>
          <p class="mt-1 text-sm leading-5 text-[var(--z-muted)]">{{ message() }}</p>
        </div>
        <z-icon-button [label]="closeLabel()" size="sm" (pressed)="dismissed.emit()">
          <svg lucideX class="size-4" aria-hidden="true"></svg>
        </z-icon-button>
      </div>
    </aside>
  `,
})
export class ZToastComponent {
  readonly title = input.required<string>();
  readonly message = input.required<string>();
  readonly type = input<ToastType>('info');
  readonly closeLabel = input('Dismiss notification');
  readonly dismissed = output<void>();

  protected readonly toneClasses = computed(() => {
    switch (this.type()) {
      case 'success':
        return 'border-green-200';
      case 'error':
        return 'border-rose-200';
      default:
        return 'border-[var(--z-border)]';
    }
  });

  protected readonly iconClasses = computed(() => {
    switch (this.type()) {
      case 'success':
        return 'bg-green-50 text-[var(--z-success)]';
      case 'error':
        return 'bg-rose-50 text-[var(--z-danger)]';
      default:
        return 'bg-[var(--z-surface-warm)] text-[var(--z-primary)]';
    }
  });
}
