import { NgClass } from '@angular/common';
import { Component, computed, input, output } from '@angular/core';
import { NgpButton } from 'ng-primitives/button';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md';

@Component({
  selector: 'z-button',
  imports: [NgClass, NgpButton],
  template: `
    <button
      ngpButton
      [type]="type()"
      [disabled]="disabled()"
      [attr.aria-label]="ariaLabel()"
      [ngClass]="classes()"
      (click)="pressed.emit()"
    >
      <ng-content />
    </button>
  `,
})
export class ZButtonComponent {
  readonly variant = input<ButtonVariant>('primary');
  readonly size = input<ButtonSize>('md');
  readonly type = input<'button' | 'submit' | 'reset'>('button');
  readonly disabled = input(false);
  readonly ariaLabel = input<string | null>(null);
  readonly iconOnly = input(false);
  readonly pressed = output<void>();

  protected readonly classes = computed(() => [
    'inline-flex items-center justify-center gap-2 rounded-md border font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
    this.sizeClasses(),
    this.variantClasses(),
  ]);

  private sizeClasses(): string {
    if (this.iconOnly()) {
      return this.size() === 'sm' ? 'size-9 p-0 text-sm' : 'size-11 p-0 text-sm';
    }

    return this.size() === 'sm' ? 'min-h-9 px-3 text-sm' : 'min-h-11 px-4 text-sm';
  }

  private variantClasses(): string {
    switch (this.variant()) {
      case 'secondary':
        return 'border-[var(--z-border)] bg-white text-[var(--z-text)] hover:bg-[var(--z-surface-warm)] focus-visible:outline-[var(--z-primary)]';
      case 'ghost':
        return 'border-transparent bg-transparent text-[var(--z-muted)] hover:bg-[var(--z-surface-warm)] hover:text-[var(--z-text)] focus-visible:outline-[var(--z-primary)]';
      case 'danger':
        return 'border-rose-700 bg-rose-700 text-white hover:bg-rose-800 focus-visible:outline-rose-700';
      default:
        return 'border-[var(--z-primary)] bg-[var(--z-primary)] text-white hover:bg-[var(--z-primary-strong)] focus-visible:outline-[var(--z-primary)]';
    }
  }
}
