import { AbstractControl, Validators } from '@angular/forms';
import { Component, computed, input } from '@angular/core';

@Component({
  selector: 'z-field-label',
  template: `
    <span class="text-sm font-semibold">
      {{ label() }}
      @if (isRequired()) {
        <span class="text-[var(--z-primary)]" aria-hidden="true">*</span>
      }
    </span>
  `,
})
export class ZFieldLabelComponent {
  readonly label = input.required<string>();
  readonly control = input<AbstractControl | null>(null);

  protected readonly isRequired = computed(() => {
    const control = this.control();

    return (
      control?.hasValidator(Validators.required) ||
      control?.hasValidator(Validators.requiredTrue) ||
      false
    );
  });
}
