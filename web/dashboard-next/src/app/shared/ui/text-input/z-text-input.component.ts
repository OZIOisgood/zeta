import { NgClass } from '@angular/common';
import { Component, computed, forwardRef, input, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
  selector: 'z-text-input',
  imports: [NgClass],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => ZTextInputComponent),
      multi: true,
    },
  ],
  template: `
    <input
      [type]="type()"
      [value]="value()"
      [placeholder]="placeholder()"
      [disabled]="isEffectivelyDisabled()"
      [attr.autocomplete]="autocomplete() || null"
      [attr.inputmode]="inputMode() || null"
      [attr.aria-describedby]="ariaDescribedBy() || null"
      [attr.aria-invalid]="invalid() || null"
      [ngClass]="classes()"
      (input)="handleInput($event)"
      (blur)="handleBlur()"
    />
  `,
})
export class ZTextInputComponent implements ControlValueAccessor {
  readonly type = input<
    'text' | 'email' | 'password' | 'search' | 'tel' | 'url' | 'date' | 'number' | 'time'
  >('text');
  readonly placeholder = input('');
  readonly autocomplete = input('');
  readonly inputMode = input('');
  readonly ariaDescribedBy = input('');
  readonly invalid = input(false);
  readonly disabled = input(false);

  protected readonly value = signal('');
  protected readonly isDisabled = signal(false);
  protected readonly isEffectivelyDisabled = computed(() => this.disabled() || this.isDisabled());
  protected readonly classes = computed(() => [
    'min-h-11 w-full rounded-md border bg-white px-3 text-sm outline-none transition placeholder:text-[var(--z-muted)] disabled:cursor-not-allowed disabled:bg-[var(--z-surface-warm)] disabled:text-[var(--z-muted)]',
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
    const value = (event.target as HTMLInputElement).value;
    this.value.set(value);
    this.onChange(value);
  }

  protected handleBlur(): void {
    this.onTouched();
  }
}
