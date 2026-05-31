import { Component, input, output } from '@angular/core';
import { LucideCheck } from '@lucide/angular';
import { NgpCheckbox } from 'ng-primitives/checkbox';

@Component({
  selector: 'z-checkbox',
  imports: [NgpCheckbox, LucideCheck],
  template: `
    <span
      ngpCheckbox
      class="grid size-5 shrink-0 cursor-pointer place-items-center rounded border border-[var(--z-border)] bg-white text-white outline-none transition data-[checked]:border-[var(--z-primary)] data-[checked]:bg-[var(--z-primary)] data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50 data-[focus-visible]:outline data-[focus-visible]:outline-2 data-[focus-visible]:outline-offset-2 data-[focus-visible]:outline-[var(--z-primary)]"
      [attr.aria-label]="label()"
      [ngpCheckboxChecked]="checked()"
      [ngpCheckboxDisabled]="disabled()"
      (ngpCheckboxCheckedChange)="checkedChange.emit($event)"
    >
      @if (checked()) {
        <svg lucideCheck class="size-3.5" aria-hidden="true"></svg>
      }
    </span>
  `,
})
export class ZCheckboxComponent {
  readonly checked = input(false);
  readonly disabled = input(false);
  readonly label = input.required<string>();
  readonly checkedChange = output<boolean>();
}
