import { NgClass } from '@angular/common';
import { Component, computed, input } from '@angular/core';

type BadgeTone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger';

@Component({
  selector: 'z-badge',
  imports: [NgClass],
  template: `<span [ngClass]="classes()"><ng-content /></span>`,
})
export class ZBadgeComponent {
  readonly tone = input<BadgeTone>('neutral');

  protected readonly classes = computed(() => [
    'inline-flex w-fit items-center rounded-md border px-2 py-1 text-xs font-semibold leading-none',
    this.toneClasses(),
  ]);

  private toneClasses(): string {
    switch (this.tone()) {
      case 'primary':
        return 'border-[var(--z-primary-soft)] bg-[var(--z-primary-soft)] text-[var(--z-primary-strong)]';
      case 'success':
        return 'border-green-200 bg-green-50 text-[var(--z-success)]';
      case 'warning':
        return 'border-amber-200 bg-amber-50 text-[var(--z-warning)]';
      case 'danger':
        return 'border-rose-200 bg-rose-50 text-[var(--z-danger)]';
      default:
        return 'border-[var(--z-border)] bg-white text-[var(--z-muted)]';
    }
  }
}
