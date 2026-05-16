import { Component, input, output } from '@angular/core';
import { LucideX } from '@lucide/angular';
import { ZIconButtonComponent } from '../icon-button/z-icon-button.component';

@Component({
  selector: 'z-toast',
  imports: [LucideX, ZIconButtonComponent],
  template: `
    <aside
      class="rounded-lg border border-[var(--z-border)] bg-white p-4 shadow-lg shadow-orange-950/10"
      role="status"
      aria-live="polite"
    >
      <div class="flex items-start gap-3">
        <span class="mt-1 size-2 rounded-full bg-[var(--z-primary)]" aria-hidden="true"></span>
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
  readonly closeLabel = input('Dismiss notification');
  readonly dismissed = output<void>();
}
