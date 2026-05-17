import { NgClass } from '@angular/common';
import { Component, computed, input, output } from '@angular/core';
import { LucideChevronDown } from '@lucide/angular';
import {
  NgpSelect,
  NgpSelectDropdown,
  NgpSelectOption,
  NgpSelectPortal,
} from 'ng-primitives/select';

export type SelectOption = { value: string; label: string };

@Component({
  selector: 'z-select',
  imports: [
    NgClass,
    NgpSelect,
    NgpSelectDropdown,
    NgpSelectOption,
    NgpSelectPortal,
    LucideChevronDown,
  ],
  template: `
    <div
      ngpSelect
      class="flex min-h-11 w-full cursor-pointer items-center gap-2 rounded-md border border-[var(--z-border)] bg-white px-3 text-left text-sm transition hover:bg-[var(--z-surface-warm)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--z-primary)] data-[open]:border-[var(--z-primary)] data-[open]:ring-2 data-[open]:ring-orange-100 data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50"
      [ngpSelectValue]="value()"
      [ngpSelectDisabled]="disabled()"
      [ngpSelectDropdownOffset]="4"
      (ngpSelectValueChange)="valueChange.emit($event)"
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

      <div
        *ngpSelectPortal
        ngpSelectDropdown
        class="z-50 max-h-60 overflow-auto rounded-md border border-[var(--z-border)] bg-white py-1 shadow-lg shadow-orange-950/10"
      >
        @for (option of options(); track option.value) {
          <div
            ngpSelectOption
            [ngpSelectOptionValue]="option.value"
            class="flex cursor-pointer items-center px-3 py-2 text-sm transition data-[active]:bg-[var(--z-surface-warm)] data-[selected]:font-semibold data-[selected]:text-[var(--z-primary-strong)]"
          >
            {{ option.label }}
          </div>
        }
      </div>
    </div>
  `,
  styles: `
    [ngpSelectDropdown] {
      position: absolute;
      width: var(--ngp-select-width);
      margin-top: 4px;
      box-sizing: border-box;
      transform-origin: var(--ngp-select-transform-origin);
    }

    [ngpSelectDropdown][data-enter] {
      animation: z-select-show 100ms ease-out;
    }

    [ngpSelectDropdown][data-exit] {
      animation: z-select-hide 100ms ease-in;
    }

    @keyframes z-select-show {
      from {
        opacity: 0;
        transform: translateY(-4px) scale(0.98);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }

    @keyframes z-select-hide {
      from {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
      to {
        opacity: 0;
        transform: translateY(-4px) scale(0.98);
      }
    }
  `,
})
export class ZSelectComponent {
  readonly value = input<string | undefined>(undefined);
  readonly options = input.required<SelectOption[]>();
  readonly placeholder = input('Select an option');
  readonly disabled = input(false);
  readonly valueChange = output<string>();

  protected readonly selectedLabel = computed(
    () => this.options().find((option) => option.value === this.value())?.label ?? '',
  );
}
