import { NgClass } from '@angular/common';
import {
  Component,
  ElementRef,
  computed,
  forwardRef,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

const NON_CROCKFORD = /[^0-9A-HJKMNP-TV-Z]/g;

@Component({
  selector: 'z-otp-input',
  imports: [NgClass],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => ZOtpInputComponent),
      multi: true,
    },
  ],
  template: `
    <div
      class="relative flex items-center gap-2.5"
      role="group"
      [attr.aria-label]="ariaLabel()"
      (click)="focus()"
    >
      <input
        #field
        class="absolute inset-0 size-full cursor-text border-0 bg-transparent text-transparent caret-transparent outline-none"
        type="text"
        inputmode="text"
        autocapitalize="characters"
        autocomplete="one-time-code"
        spellcheck="false"
        [attr.maxlength]="length()"
        [value]="value()"
        [attr.aria-label]="ariaLabel()"
        [attr.aria-invalid]="invalid() || null"
        [attr.aria-describedby]="ariaDescribedBy() || null"
        [disabled]="isEffectivelyDisabled()"
        (input)="handleInput($event)"
        (focus)="focused.set(true)"
        (blur)="handleBlur()"
        (keydown.enter)="onEnter($event)"
      />

      @for (group of groups(); track $index; let last = $last) {
        <div class="flex flex-1 gap-2 sm:gap-2.5">
          @for (slot of group; track slot.index) {
            <div
              class="z-otp-slot relative grid h-[52px] min-w-0 flex-1 place-items-center border-b-[3px] text-2xl font-bold uppercase tabular-nums transition-colors"
              [ngClass]="cellClasses(slot)"
              aria-hidden="true"
            >
              @if (slot.char) {
                {{ slot.char }}
              } @else if (slot.active) {
                <span
                  class="h-[26px] w-0.5 rounded-sm bg-[var(--z-primary)] motion-safe:animate-[z-otp-blink_1s_step-end_infinite]"
                ></span>
              }
            </div>
          }
        </div>
        @if (!last) {
          <span
            class="h-0.5 w-3 shrink-0 rounded-sm bg-[var(--z-muted)] opacity-45"
            aria-hidden="true"
          ></span>
        }
      }
    </div>
  `,
  styles: `
    @keyframes z-otp-blink {
      50% {
        opacity: 0;
      }
    }
  `,
})
export class ZOtpInputComponent implements ControlValueAccessor {
  readonly length = input(8);
  readonly groupSize = input(4);
  readonly invalid = input(false);
  readonly ariaLabel = input('Invite code');
  readonly ariaDescribedBy = input('');
  readonly disabled = input(false);

  readonly completed = output<string>();
  readonly submitted = output<void>();

  private readonly field = viewChild.required<ElementRef<HTMLInputElement>>('field');
  protected readonly value = signal('');
  protected readonly focused = signal(false);
  protected readonly formDisabled = signal(false);
  protected readonly isEffectivelyDisabled = computed(() => this.disabled() || this.formDisabled());

  protected readonly groups = computed(() => {
    const chars = this.value();
    const total = this.length();
    const size = Math.max(1, this.groupSize());
    const slots = Array.from({ length: total }, (_, index) => ({
      index,
      char: chars[index] ?? '',
      active: this.focused() && index === Math.min(chars.length, total - 1),
    }));
    const grouped: (typeof slots)[] = [];
    for (let i = 0; i < slots.length; i += size) grouped.push(slots.slice(i, i + size));
    return grouped;
  });

  private onChange: (value: string) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  protected cellClasses(slot: { active: boolean }): string {
    if (this.invalid()) return 'border-rose-400 text-rose-700';
    if (this.isEffectivelyDisabled())
      return 'cursor-not-allowed border-[var(--z-border)] text-[var(--z-muted)]';
    return this.focused() && slot.active
      ? 'border-[var(--z-primary)]'
      : 'border-[rgba(38,24,15,0.28)]';
  }

  focus(): void {
    if (!this.isEffectivelyDisabled()) this.field().nativeElement.focus();
  }

  reselect(): void {
    const element = this.field().nativeElement;
    element.focus();
    element.select();
  }

  writeValue(value: string | null | undefined): void {
    this.value.set(this.normalize(value ?? ''));
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(disabled: boolean): void {
    this.formDisabled.set(disabled);
  }

  protected handleInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const next = this.normalize(input.value);
    input.value = next;
    this.value.set(next);
    this.onChange(next);
    if (next.length === this.length()) this.completed.emit(next);
  }

  protected handleBlur(): void {
    this.focused.set(false);
    this.onTouched();
  }

  protected onEnter(event: Event): void {
    event.preventDefault();
    this.submitted.emit();
  }

  private normalize(raw: string): string {
    return raw
      .toUpperCase()
      .replace(/[IL]/g, '1')
      .replace(/O/g, '0')
      .replace(NON_CROCKFORD, '')
      .slice(0, this.length());
  }
}
