import { Component, input, output } from '@angular/core';
import { NgpTabButton, NgpTabList, NgpTabset } from 'ng-primitives/tabs';

export type TabOption = {
  value: string;
  label: string;
  badge?: string | number;
};

@Component({
  selector: 'z-tabs',
  imports: [NgpTabset, NgpTabList, NgpTabButton],
  template: `
    <div
      ngpTabset
      [id]="tabsId()"
      [ngpTabsetValue]="value()"
      (ngpTabsetValueChange)="selectValue($event)"
    >
      <div
        ngpTabList
        class="flex max-w-full gap-2 overflow-x-auto border-b border-[var(--z-border)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        [attr.aria-label]="label()"
      >
        @for (option of options(); track option.value) {
          <button
            ngpTabButton
            type="button"
            class="-mb-px inline-flex min-h-12 shrink-0 items-center gap-2 border-b-[3px] border-transparent px-3 text-sm font-semibold text-[var(--z-muted)] outline-none transition hover:text-[var(--z-text)] data-[active]:border-[var(--z-primary)] data-[active]:text-[var(--z-text)] data-[focus-visible]:outline data-[focus-visible]:outline-2 data-[focus-visible]:outline-offset-[-2px] data-[focus-visible]:outline-[var(--z-primary)]"
            [ngpTabButtonValue]="option.value"
          >
            <span>{{ option.label }}</span>
            @if (option.badge !== undefined) {
              <span
                class="grid min-h-7 min-w-7 place-items-center rounded-full bg-[var(--z-surface-warm)] px-2 text-xs font-semibold text-[var(--z-muted)]"
              >
                {{ option.badge }}
              </span>
            }
          </button>
        }
      </div>
    </div>
  `,
})
export class ZTabsComponent {
  readonly tabsId = input.required<string>();
  readonly label = input('Tabs');
  readonly value = input.required<string>();
  readonly options = input.required<TabOption[]>();
  readonly valueChange = output<string>();

  protected selectValue(value: string | undefined): void {
    if (value) {
      this.valueChange.emit(value);
    }
  }
}
