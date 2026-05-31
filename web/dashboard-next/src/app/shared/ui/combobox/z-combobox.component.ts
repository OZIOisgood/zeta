import { Component, computed, effect, input, output, signal } from '@angular/core';
import { LucideChevronDown } from '@lucide/angular';
import {
  NgpCombobox,
  NgpComboboxButton,
  NgpComboboxDropdown,
  NgpComboboxInput,
  NgpComboboxOption,
  NgpComboboxPortal,
} from 'ng-primitives/combobox';
import { SelectOption } from '../select/z-select.component';

@Component({
  selector: 'z-combobox',
  imports: [
    NgpCombobox,
    NgpComboboxButton,
    NgpComboboxDropdown,
    NgpComboboxInput,
    NgpComboboxOption,
    NgpComboboxPortal,
    LucideChevronDown,
  ],
  template: `
    <div
      ngpCombobox
      class="flex min-h-11 w-full items-center rounded-md border border-[var(--z-border)] bg-white transition data-[focus]:border-[var(--z-primary)] data-[focus]:ring-2 data-[focus]:ring-orange-100 data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50"
      [ngpComboboxValue]="value()"
      [ngpComboboxDisabled]="disabled()"
      [ngpComboboxDropdownOffset]="4"
      (ngpComboboxValueChange)="selectValue($event)"
      (ngpComboboxOpenChange)="handleOpenChange($event)"
    >
      <input
        ngpComboboxInput
        class="min-h-10 min-w-0 flex-1 bg-transparent px-3 text-sm outline-none placeholder:text-[var(--z-muted)]"
        type="text"
        autocomplete="off"
        [attr.aria-label]="label()"
        [placeholder]="placeholder()"
        [value]="inputText()"
        (input)="handleInput($event)"
      />
      <button
        ngpComboboxButton
        class="grid min-h-10 w-10 shrink-0 place-items-center text-[var(--z-muted)] outline-none"
        type="button"
        [attr.aria-label]="toggleLabel()"
      >
        <svg lucideChevronDown class="size-4 transition data-[open]:rotate-180" aria-hidden="true"></svg>
      </button>

      <div
        *ngpComboboxPortal
        ngpComboboxDropdown
        class="z-50 max-h-60 overflow-auto rounded-md border border-[var(--z-border)] bg-white py-1 shadow-lg shadow-orange-950/10"
      >
        @for (option of filteredOptions(); track option.value) {
          <div
            ngpComboboxOption
            [ngpComboboxOptionValue]="option.value"
            class="flex cursor-pointer items-center px-3 py-2 text-sm transition data-[active]:bg-[var(--z-surface-warm)] data-[selected]:font-semibold data-[selected]:text-[var(--z-primary-strong)]"
          >
            {{ option.label }}
          </div>
        } @empty {
          <p class="px-3 py-2 text-sm text-[var(--z-muted)]">{{ noOptionsLabel() }}</p>
        }
      </div>
    </div>
  `,
  styles: `
    [ngpComboboxDropdown] {
      position: absolute;
      width: var(--ngp-combobox-width);
      margin-top: 4px;
      box-sizing: border-box;
      transform-origin: var(--ngp-combobox-transform-origin);
    }

    [ngpComboboxDropdown][data-enter] {
      animation: z-combobox-show 100ms ease-out;
    }

    [ngpComboboxDropdown][data-exit] {
      animation: z-combobox-hide 100ms ease-in;
    }

    @keyframes z-combobox-show {
      from {
        opacity: 0;
        transform: translateY(-4px) scale(0.98);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }

    @keyframes z-combobox-hide {
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
export class ZComboboxComponent {
  readonly value = input<string | undefined>(undefined);
  readonly options = input.required<SelectOption[]>();
  readonly label = input('Search options');
  readonly placeholder = input('Search options');
  readonly toggleLabel = input('Toggle options');
  readonly noOptionsLabel = input('No options found');
  readonly disabled = input(false);
  readonly valueChange = output<string>();

  protected readonly inputText = signal('');
  private readonly isOpen = signal(false);
  protected readonly filteredOptions = computed(() => {
    const query = this.inputText().trim().toLowerCase();

    return query
      ? this.options().filter((option) => option.label.toLowerCase().includes(query))
      : this.options();
  });

  constructor() {
    effect(() => {
      const value = this.value();
      const options = this.options();

      if (!this.isOpen()) {
        this.inputText.set(options.find((option) => option.value === value)?.label ?? '');
      }
    });
  }

  protected handleInput(event: Event): void {
    this.inputText.set((event.target as HTMLInputElement).value);
  }

  protected handleOpenChange(isOpen: boolean): void {
    this.isOpen.set(isOpen);
    this.inputText.set(
      isOpen ? '' : (this.options().find((option) => option.value === this.value())?.label ?? ''),
    );
  }

  protected selectValue(value: unknown): void {
    if (typeof value !== 'string') {
      return;
    }

    this.inputText.set(this.options().find((option) => option.value === value)?.label ?? value);
    this.valueChange.emit(value);
  }
}
