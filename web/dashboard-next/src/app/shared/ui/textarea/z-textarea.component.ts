import { NgClass } from '@angular/common';
import { Component, computed, forwardRef, input, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
  selector: 'z-textarea',
  imports: [NgClass],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => ZTextareaComponent),
      multi: true,
    },
  ],
  template: `
    <textarea
      [value]="value()"
      [placeholder]="placeholder()"
      [rows]="rows()"
      [disabled]="isEffectivelyDisabled()"
      [ngClass]="classes()"
      (input)="handleInput($event)"
      (blur)="handleBlur()"
    ></textarea>
  `,
})
export class ZTextareaComponent implements ControlValueAccessor {
  readonly placeholder = input('');
  readonly rows = input(4);
  readonly invalid = input(false);
  readonly disabled = input(false);

  protected readonly value = signal('');
  protected readonly isDisabled = signal(false);
  protected readonly isEffectivelyDisabled = computed(() => this.disabled() || this.isDisabled());
  protected readonly classes = computed(() => [
    'min-h-28 w-full resize-y rounded-md border bg-white px-3 py-2 text-sm outline-none transition placeholder:text-[var(--z-muted)] disabled:cursor-not-allowed disabled:bg-[var(--z-surface-warm)] disabled:text-[var(--z-muted)]',
    this.invalid()
      ? 'border-rose-300 focus:border-rose-500 focus:ring-2 focus:ring-rose-100'
      : 'border-[var(--z-border)] focus:border-[var(--z-primary)] focus:ring-2 focus:ring-orange-100',
  ]);

  private onChange: (value: string) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  writeValue(value: string | null | undefined): void {
    this.value.set(value ?? '');
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.isDisabled.set(isDisabled);
  }

  protected handleInput(event: Event): void {
    const value = (event.target as HTMLTextAreaElement).value;
    this.value.set(value);
    this.onChange(value);
  }

  protected handleBlur(): void {
    this.onTouched();
  }
}
