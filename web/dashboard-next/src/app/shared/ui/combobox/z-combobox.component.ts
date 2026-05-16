import { NgClass } from '@angular/common';
import { Component, computed, input, output } from '@angular/core';
import { LucideChevronDown } from '@lucide/angular';
import {
  NgpCombobox,
  NgpComboboxButton,
  NgpComboboxDropdown,
  NgpComboboxOption,
  NgpComboboxPortal,
} from 'ng-primitives/combobox';

export type ComboboxOption = { value: string; label: string };

@Component({
  selector: 'z-combobox',
  imports: [
    NgClass,
    NgpCombobox,
    NgpComboboxButton,
    NgpComboboxDropdown,
    NgpComboboxOption,
    NgpComboboxPortal,
    LucideChevronDown,
  ],
  template: `
    <div
      ngpCombobox
      class="relative block w-full"
      [ngpComboboxValue]="value()"
      [ngpComboboxDropdownOffset]="4"
      (ngpComboboxValueChange)="valueChange.emit($event)"
    >
      <button
        ngpComboboxButton
        class="flex min-h-11 w-full items-center gap-2 rounded-md border border-[var(--z-border)] bg-white px-3 text-left text-sm transition hover:bg-[var(--z-surface-warm)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--z-primary)] data-[open]:border-[var(--z-primary)] data-[open]:ring-2 data-[open]:ring-orange-100"
      >
        <span
          class="min-w-0 flex-1 truncate"
          [ngClass]="selectedLabel() ? 'text-[var(--z-text)]' : 'text-[var(--z-muted)]'"
        >
          {{ selectedLabel() || placeholder() }}
        </span>
        <svg
          lucideChevronDown
          class="size-4 shrink-0 text-[var(--z-muted)] transition data-[open]:rotate-180"
          aria-hidden="true"
        ></svg>
      </button>

      <ng-template ngpComboboxPortal>
        <div
          ngpComboboxDropdown
          class="fixed z-50 max-h-60 overflow-auto rounded-md border border-[var(--z-border)] bg-white py-1 shadow-lg shadow-orange-950/10"
          style="min-width: var(--ngp-combobox-width, 12rem)"
        >
          @for (option of options(); track option.value) {
            <div
              ngpComboboxOption
              [ngpComboboxOptionValue]="option.value"
              class="flex cursor-pointer items-center px-3 py-2 text-sm transition data-[active]:bg-[var(--z-surface-warm)] data-[selected]:font-semibold data-[selected]:text-[var(--z-primary-strong)]"
            >
              {{ option.label }}
            </div>
          }
        </div>
      </ng-template>
    </div>
  `,
})
export class ZComboboxComponent {
  readonly value = input<string | undefined>(undefined);
  readonly options = input.required<ComboboxOption[]>();
  readonly placeholder = input('Select an option');
  readonly valueChange = output<string>();

  protected readonly selectedLabel = computed(
    () => this.options().find((o) => o.value === this.value())?.label ?? '',
  );
}
