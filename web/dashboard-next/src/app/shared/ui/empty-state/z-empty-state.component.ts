import { Component, input } from '@angular/core';
import { LucideInbox } from '@lucide/angular';

@Component({
  selector: 'z-empty-state',
  imports: [LucideInbox],
  template: `
    <section
      class="grid place-items-center rounded-lg border border-dashed border-[var(--z-border)] bg-[var(--z-surface)] px-5 py-8 text-center"
    >
      <div class="max-w-sm">
        <span
          class="mx-auto grid size-12 place-items-center rounded-lg bg-[var(--z-surface-warm)] text-[var(--z-primary)]"
        >
          <svg lucideInbox class="size-6" aria-hidden="true"></svg>
        </span>
        <h2 class="mt-4 text-base font-semibold">{{ title() }}</h2>
        <p class="mt-2 text-sm leading-6 text-[var(--z-muted)]">{{ description() }}</p>
        <div class="mt-5">
          <ng-content />
        </div>
      </div>
    </section>
  `,
})
export class ZEmptyStateComponent {
  readonly title = input.required<string>();
  readonly description = input.required<string>();
}
