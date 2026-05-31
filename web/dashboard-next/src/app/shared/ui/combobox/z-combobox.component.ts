import { Component, Directive, computed, input, output } from '@angular/core';
import { LucideChevronDown } from '@lucide/angular';
import {
  NgpCombobox,
  NgpComboboxButton,
  NgpComboboxDropdown,
  NgpComboboxOption,
  NgpComboboxPortal,
  injectComboboxState,
} from 'ng-primitives/combobox';
import { SelectOption } from '../select/z-select.component';

@Directive({
  selector: '[zComboboxPositionedDropdown]',
  host: {
    '[style.width.px]': 'comboboxWidth',
    '[style.visibility]': "positioned() ? 'visible' : 'hidden'",
  },
})
export class ZComboboxPositionedDropdownDirective {
  private readonly state = injectComboboxState();
  protected readonly positioned = computed(() => this.state().overlay()?.isPositioned() ?? false);

  // The primitive updates its width CSS variable through ResizeObserver. Bind the
  // trigger width immediately so the first Floating UI pass uses the final geometry.
  protected get comboboxWidth(): number {
    return this.state().elementRef.nativeElement.getBoundingClientRect().width;
  }
}

@Component({
  selector: 'z-combobox',
  imports: [
    NgpCombobox,
    NgpComboboxButton,
    NgpComboboxDropdown,
    NgpComboboxOption,
    NgpComboboxPortal,
    ZComboboxPositionedDropdownDirective,
    LucideChevronDown,
  ],
  template: `
    <div
      ngpCombobox
      class="w-full"
      [ngpComboboxValue]="value()"
      [ngpComboboxDisabled]="disabled()"
      [ngpComboboxDropdownOffset]="4"
      (ngpComboboxValueChange)="selectValue($event)"
    >
      <button
        ngpComboboxButton
        class="flex min-h-11 w-full items-center justify-between gap-3 rounded-md border border-[var(--z-border)] bg-white px-3 text-left text-sm transition hover:bg-[var(--z-surface-warm)] focus-visible:border-[var(--z-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-100 data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50"
        type="button"
        [attr.aria-label]="toggleLabel()"
      >
        <span class="truncate" [class.text-[var(--z-muted)]]="!selectedLabel()">
          {{ selectedLabel() || placeholder() }}
        </span>
        <svg
          lucideChevronDown
          class="size-4 shrink-0 text-[var(--z-muted)] transition"
          aria-hidden="true"
        ></svg>
      </button>

      <div
        *ngpComboboxPortal
        ngpComboboxDropdown
        zComboboxPositionedDropdown
        class="z-50 max-h-60 overflow-auto rounded-md border border-[var(--z-border)] bg-white py-1 shadow-lg shadow-orange-950/10"
      >
        @for (option of options(); track option.value) {
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
      top: 0;
      left: 0;
      width: var(--ngp-combobox-width);
      margin-top: 4px;
      box-sizing: border-box;
      transform-origin: var(--ngp-combobox-transform-origin);
    }

    [ngpComboboxButton][data-open] svg {
      transform: rotate(180deg);
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

  protected readonly selectedLabel = computed(
    () => this.options().find((option) => option.value === this.value())?.label ?? '',
  );

  protected selectValue(value: unknown): void {
    if (typeof value !== 'string') {
      return;
    }

    this.valueChange.emit(value);
  }
}
