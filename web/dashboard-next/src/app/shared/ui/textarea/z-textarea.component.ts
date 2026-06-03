import { NgClass } from '@angular/common';
import {
  Component,
  ElementRef,
  afterNextRender,
  computed,
  effect,
  forwardRef,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
  selector: 'z-textarea',
  imports: [NgClass],
  styles: `
    :host {
      display: block;
    }
  `,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => ZTextareaComponent),
      multi: true,
    },
  ],
  template: `
    <textarea
      #textarea
      [value]="value()"
      [placeholder]="placeholder()"
      [rows]="rows()"
      [disabled]="isEffectivelyDisabled()"
      [attr.aria-describedby]="ariaDescribedBy() || null"
      [attr.aria-invalid]="invalid() || null"
      [ngClass]="classes()"
      (input)="handleInput($event)"
      (blur)="handleBlur()"
    ></textarea>
  `,
})
export class ZTextareaComponent implements ControlValueAccessor {
  readonly placeholder = input('');
  readonly rows = input(4);
  readonly autoResize = input(false);
  readonly maxRows = input(8);
  readonly ariaDescribedBy = input('');
  readonly invalid = input(false);
  readonly disabled = input(false);

  private readonly textarea = viewChild<ElementRef<HTMLTextAreaElement>>('textarea');

  protected readonly value = signal('');
  protected readonly isDisabled = signal(false);
  protected readonly isEffectivelyDisabled = computed(() => this.disabled() || this.isDisabled());
  protected readonly classes = computed(() => [
    'block box-border w-full rounded-md border bg-white px-3 text-sm outline-none transition placeholder:text-[var(--z-muted)] disabled:cursor-not-allowed disabled:bg-[var(--z-surface-warm)] disabled:text-[var(--z-muted)]',
    this.autoResize() ? 'min-h-11 resize-none overflow-hidden' : 'min-h-28 resize-y',
    this.autoResize() ? 'py-[11px] leading-5' : 'py-2',
    this.invalid()
      ? 'border-rose-300 focus:border-rose-500 focus:ring-2 focus:ring-rose-100'
      : 'border-[var(--z-border)] focus:border-[var(--z-primary)] focus:ring-2 focus:ring-orange-100',
  ]);

  private onChange: (value: string) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  constructor() {
    afterNextRender(() => this.resizeTextarea());

    effect(() => {
      this.value();
      this.autoResize();
      this.maxRows();

      queueMicrotask(() => this.resizeTextarea());
    });
  }

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
    this.resizeTextarea();
  }

  protected handleBlur(): void {
    this.onTouched();
  }

  private resizeTextarea(): void {
    if (!this.autoResize()) return;

    const textarea = this.textarea()?.nativeElement;
    if (!textarea) return;

    const collapsedHeight = 44;

    if (this.value().length === 0) {
      textarea.style.height = `${collapsedHeight}px`;
      textarea.style.overflowY = 'hidden';
      return;
    }

    textarea.style.height = 'auto';

    const maxHeight = this.getMaxHeight(textarea);
    const nextHeight = Math.min(textarea.scrollHeight, maxHeight);

    textarea.style.maxHeight = `${maxHeight}px`;
    textarea.style.height = `${Math.max(collapsedHeight, nextHeight)}px`;
    textarea.style.overflowY = textarea.scrollHeight > maxHeight ? 'auto' : 'hidden';
  }

  private getMaxHeight(textarea: HTMLTextAreaElement): number {
    const style = window.getComputedStyle(textarea);
    const lineHeight = Number.parseFloat(style.lineHeight) || 20;
    const padding =
      Number.parseFloat(style.paddingTop) +
      Number.parseFloat(style.paddingBottom) +
      Number.parseFloat(style.borderTopWidth) +
      Number.parseFloat(style.borderBottomWidth);

    return lineHeight * Math.max(1, this.maxRows()) + padding;
  }
}
