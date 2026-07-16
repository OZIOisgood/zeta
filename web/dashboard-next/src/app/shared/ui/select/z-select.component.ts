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
      class="flex min-h-11 w-full cursor-pointer items-center gap-2 rounded-md border px-3 text-left text-sm transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 data-[open]:ring-2 data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50"
      [ngClass]="triggerClasses()"
      [attr.aria-label]="ariaLabel() || null"
      [attr.aria-describedby]="ariaDescribedBy() || null"
      [attr.aria-invalid]="invalid() || null"
      [ngpSelectValue]="value()"
      [ngpSelectDisabled]="disabled()"
      [ngpSelectDropdownOffset]="4"
      (ngpSelectValueChange)="valueChange.emit($event)"
    >
      <span class="min-w-0 flex-1 truncate" [ngClass]="labelClasses()">
        {{ selectedLabel() || placeholder() }}
      </span>
      <svg
        lucideChevronDown
        class="size-4 shrink-0 transition data-[open]:rotate-180"
        [ngClass]="tone() === 'dark' ? 'text-zinc-400' : 'text-[var(--z-muted)]'"
        aria-hidden="true"
      ></svg>

      <div
        *ngpSelectPortal
        ngpSelectDropdown
        class="z-50 max-h-60 overflow-auto rounded-md border py-1 shadow-lg"
        [ngClass]="dropdownClasses()"
      >
        @for (option of options(); track option.value) {
          <div
            ngpSelectOption
            [ngpSelectOptionValue]="option.value"
            class="flex cursor-pointer items-center px-3 py-2 text-sm transition data-[selected]:font-semibold"
            [ngClass]="optionClasses()"
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
  readonly ariaLabel = input('');
  readonly ariaDescribedBy = input('');
  readonly invalid = input(false);
  readonly disabled = input(false);
  readonly tone = input<'light' | 'dark'>('light');
  readonly valueChange = output<string>();

  protected readonly selectedLabel = computed(
    () => this.options().find((option) => option.value === this.value())?.label ?? '',
  );
  protected readonly triggerClasses = computed(() => {
    if (this.tone() === 'dark') {
      return [
        'border-zinc-700 bg-zinc-900 text-white hover:bg-zinc-800 focus-visible:outline-white data-[open]:border-zinc-500 data-[open]:ring-zinc-700',
        this.invalid()
          ? 'border-rose-500 data-[open]:border-rose-400 data-[open]:ring-rose-950'
          : '',
      ];
    }
    return [
      'bg-white hover:bg-[var(--z-surface-warm)] focus-visible:outline-[var(--z-primary)]',
      this.invalid()
        ? 'border-rose-300 data-[open]:border-rose-500 data-[open]:ring-rose-100'
        : 'border-[var(--z-border)] data-[open]:border-[var(--z-primary)] data-[open]:ring-orange-100',
    ];
  });
  protected readonly labelClasses = computed(() => {
    if (this.tone() === 'dark') return this.selectedLabel() ? 'text-white' : 'text-zinc-400';
    return this.selectedLabel() ? 'text-[var(--z-text)]' : 'text-[var(--z-muted)]';
  });
  protected readonly dropdownClasses = computed(() =>
    this.tone() === 'dark'
      ? 'border-zinc-700 bg-zinc-950 text-white shadow-black/40'
      : 'border-[var(--z-border)] bg-white shadow-orange-950/10',
  );
  protected readonly optionClasses = computed(() =>
    this.tone() === 'dark'
      ? 'data-[active]:bg-zinc-800 data-[selected]:text-orange-300'
      : 'data-[active]:bg-[var(--z-surface-warm)] data-[selected]:text-[var(--z-primary-strong)]',
  );
}
