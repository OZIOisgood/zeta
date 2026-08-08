import { AbstractControl, Validators } from '@angular/forms';
import { Component, computed, input } from '@angular/core';
import { LucideInfo } from '@lucide/angular';
import { NgpTooltip, NgpTooltipTrigger } from 'ng-primitives/tooltip';

@Component({
  selector: 'z-field-label',
  imports: [LucideInfo, NgpTooltip, NgpTooltipTrigger],
  template: `
    <span class="inline-flex items-center gap-1 text-sm font-semibold">
      {{ label() }}
      @if (isRequired()) {
        <span class="text-[var(--z-primary)]" aria-hidden="true">*</span>
      }
      @if (hint(); as hintText) {
        <button
          type="button"
          class="inline-grid size-5 place-items-center rounded-full text-[var(--z-muted)] transition hover:bg-[var(--z-surface-warm)] hover:text-[var(--z-text)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--z-primary)]"
          [attr.aria-label]="hintAriaLabel() || label()"
          [ngpTooltipTrigger]="hintTooltip"
          ngpTooltipTriggerPlacement="top"
          [ngpTooltipTriggerUseTextContent]="false"
        >
          <svg lucideInfo class="size-3.5" aria-hidden="true"></svg>
        </button>

        <ng-template #hintTooltip>
          <div
            ngpTooltip
            class="z-50 max-w-64 rounded-md bg-zinc-950 px-3 py-2 text-xs font-medium leading-5 text-white shadow-lg"
          >
            {{ hintText }}
          </div>
        </ng-template>
      }
    </span>
  `,
})
export class ZFieldLabelComponent {
  readonly label = input.required<string>();
  readonly control = input<AbstractControl | null>(null);
  readonly hint = input<string | null>(null);
  readonly hintAriaLabel = input<string | null>(null);

  protected readonly isRequired = computed(() => {
    const control = this.control();

    return (
      control?.hasValidator(Validators.required) ||
      control?.hasValidator(Validators.requiredTrue) ||
      false
    );
  });
}
