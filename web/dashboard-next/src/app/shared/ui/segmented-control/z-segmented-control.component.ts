import { NgClass } from '@angular/common';
import { Component, input, output } from '@angular/core';
import { NgpButton } from 'ng-primitives/button';

export type SegmentedOption = {
  value: string;
  label: string;
};

@Component({
  selector: 'z-segmented-control',
  imports: [NgClass, NgpButton],
  template: `
    <div
      class="inline-flex max-w-full rounded-lg border border-[var(--z-border)] bg-[var(--z-surface-warm)] p-1"
      role="tablist"
      [attr.aria-label]="label()"
    >
      @for (option of options(); track option.value) {
        <button
          ngpButton
          type="button"
          role="tab"
          class="min-h-8 truncate rounded-md px-3 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--z-primary)]"
          [attr.aria-selected]="option.value === value()"
          [ngClass]="
            option.value === value()
              ? 'bg-white text-[var(--z-text)] shadow-sm'
              : 'text-[var(--z-muted)] hover:text-[var(--z-text)]'
          "
          (click)="valueChange.emit(option.value)"
        >
          {{ option.label }}
        </button>
      }
    </div>
  `,
})
export class ZSegmentedControlComponent {
  readonly label = input('Segmented control');
  readonly value = input.required<string>();
  readonly options = input.required<SegmentedOption[]>();
  readonly valueChange = output<string>();
}
