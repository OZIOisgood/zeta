import { Component, input } from '@angular/core';
import { LucideCircleAlert } from '@lucide/angular';

@Component({
  selector: 'z-field-error',
  imports: [LucideCircleAlert],
  host: {
    '[attr.id]': 'id()',
    role: 'alert',
    class: 'flex items-start gap-1.5 text-xs font-medium leading-5 text-rose-700',
  },
  template: `
    <svg lucideCircleAlert class="mt-0.5 size-3.5 shrink-0" aria-hidden="true"></svg>
    <span>{{ message() }}</span>
  `,
})
export class ZFieldErrorComponent {
  readonly id = input.required<string>();
  readonly message = input.required<string>();
}
