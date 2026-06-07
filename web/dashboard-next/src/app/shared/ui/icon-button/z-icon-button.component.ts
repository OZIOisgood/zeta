import { NgClass } from '@angular/common';
import { Component, computed, input, output } from '@angular/core';
import { NgpButton } from 'ng-primitives/button';

type IconButtonVariant = 'primary' | 'secondary' | 'ghost';
type IconButtonSize = 'sm' | 'md';

@Component({
  selector: 'z-icon-button',
  imports: [NgClass, NgpButton],
  template: `
    <button
      ngpButton
      type="button"
      [attr.aria-label]="label()"
      [attr.aria-expanded]="expanded()"
      [attr.aria-haspopup]="hasPopup()"
      [disabled]="disabled()"
      [ngClass]="classes()"
      (click)="pressed.emit()"
    >
      <ng-content />
    </button>
  `,
})
export class ZIconButtonComponent {
  readonly label = input.required<string>();
  readonly variant = input<IconButtonVariant>('ghost');
  readonly size = input<IconButtonSize>('md');
  readonly disabled = input(false);
  // Optional disclosure semantics for menu/dropdown triggers. Null (default)
  // omits the attribute entirely so plain icon buttons are unaffected.
  readonly expanded = input<boolean | null>(null);
  readonly hasPopup = input<string | null>(null);
  readonly pressed = output<void>();

  protected readonly classes = computed(() => [
    'inline-grid shrink-0 place-items-center rounded-md border transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
    this.size() === 'sm' ? 'size-9' : 'size-11',
    this.variantClasses(),
  ]);

  private variantClasses(): string {
    switch (this.variant()) {
      case 'primary':
        return 'border-[var(--z-primary)] bg-[var(--z-primary)] text-white hover:bg-[var(--z-primary-strong)] focus-visible:outline-[var(--z-primary)]';
      case 'secondary':
        return 'border-[var(--z-border)] bg-white text-[var(--z-text)] hover:bg-[var(--z-surface-warm)] focus-visible:outline-[var(--z-primary)]';
      default:
        return 'border-transparent bg-transparent text-[var(--z-muted)] hover:bg-[var(--z-surface-warm)] hover:text-[var(--z-text)] focus-visible:outline-[var(--z-primary)]';
    }
  }
}
