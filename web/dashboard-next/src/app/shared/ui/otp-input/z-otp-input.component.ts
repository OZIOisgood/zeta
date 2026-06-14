import { NgClass } from '@angular/common';
import { Component, computed, forwardRef, input, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { NgpInputOtp, NgpInputOtpInput, NgpInputOtpSlot } from 'ng-primitives/input-otp';

/**
 * Case-insensitive Crockford Base32 alphabet (digits + uppercase letters,
 * excluding I, L, O, U). Lowercase is accepted while typing and uppercased on
 * the way out so reactive-form values are always canonical.
 */
const CROCKFORD_PATTERN = '[0-9A-HJKMNP-TV-Za-hjkmnp-tv-z]';

/**
 * Crockford-friendly one-time-code input. Wraps the headless `ngpInputOtp`
 * primitive and renders a fixed number of slot boxes styled like `z-text-input`.
 * Implements `ControlValueAccessor` so it can be used with reactive forms.
 */
@Component({
  selector: 'z-otp-input',
  imports: [NgClass, NgpInputOtp, NgpInputOtpInput, NgpInputOtpSlot],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => ZOtpInputComponent),
      multi: true,
    },
  ],
  template: `
    <div
      ngpInputOtp
      class="relative flex gap-1.5 sm:gap-2"
      [ngpInputOtpValue]="value()"
      [ngpInputOtpPattern]="pattern"
      [ngpInputOtpPasteTransformer]="uppercaseTransformer"
      [ngpInputOtpDisabled]="isEffectivelyDisabled()"
      [ngpInputOtpPlaceholder]="placeholder()"
      (ngpInputOtpValueChange)="onValue($event)"
    >
      <input
        ngpInputOtpInput
        inputmode="text"
        autocapitalize="characters"
        [attr.aria-describedby]="ariaDescribedBy() || null"
        [attr.aria-invalid]="invalid() || null"
        (blur)="onTouched()"
      />
      @for (slot of slots(); track slot) {
        <div
          ngpInputOtpSlot
          [ngClass]="slotClasses()"
          class="flex h-11 w-9 items-center justify-center rounded-md border bg-white sm:w-11 text-center text-base font-semibold uppercase tabular-nums transition outline-none data-[active]:ring-2 data-[caret]:after:ml-px data-[caret]:after:inline-block data-[caret]:after:h-5 data-[caret]:after:w-px data-[caret]:after:animate-pulse data-[caret]:after:bg-[var(--z-primary)] data-[caret]:after:content-['']"
        ></div>
      }
    </div>
  `,
})
export class ZOtpInputComponent implements ControlValueAccessor {
  readonly length = input(8);
  readonly invalid = input(false);
  readonly ariaDescribedBy = input('');
  readonly placeholder = input('');
  readonly disabled = input(false);

  protected readonly pattern = CROCKFORD_PATTERN;
  protected readonly value = signal('');
  protected readonly isDisabled = signal(false);
  protected readonly isEffectivelyDisabled = computed(() => this.disabled() || this.isDisabled());

  /** One entry per slot; the index is what the primitive reads, value is unused. */
  protected readonly slots = computed(() => Array.from({ length: this.length() }, (_, i) => i));

  protected readonly slotClasses = computed(() => [
    this.invalid()
      ? 'border-rose-300 text-rose-700 data-[active]:border-rose-500 data-[active]:ring-rose-100'
      : 'border-[var(--z-border)] text-[var(--z-text)] data-[active]:border-[var(--z-primary)] data-[active]:ring-orange-100',
    this.isEffectivelyDisabled()
      ? 'cursor-not-allowed bg-[var(--z-surface-warm)] text-[var(--z-muted)]'
      : '',
  ]);

  /** Crockford codes are uppercase; normalize pasted text before it is filtered. */
  protected readonly uppercaseTransformer = (text: string): string => text.toUpperCase();

  private onChange: (value: string) => void = () => undefined;
  protected onTouched: () => void = () => undefined;

  writeValue(value: string | null | undefined): void {
    this.value.set((value ?? '').toUpperCase());
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

  protected onValue(next: string): void {
    const upper = next.toUpperCase();
    this.value.set(upper);
    this.onChange(upper);
  }
}
