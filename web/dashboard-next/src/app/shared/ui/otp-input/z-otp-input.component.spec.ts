import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ZOtpInputComponent } from './z-otp-input.component';

@Component({
  imports: [ReactiveFormsModule, ZOtpInputComponent],
  template: `
    <z-otp-input [formControl]="control" [length]="length()" [invalid]="invalid()"></z-otp-input>
  `,
})
class HostComponent {
  readonly control = new FormControl('');
  readonly length = signal(8);
  readonly invalid = signal(false);
}

function slots(fixture: ComponentFixture<HostComponent>): HTMLElement[] {
  return Array.from(fixture.nativeElement.querySelectorAll('.z-otp-slot'));
}

function hiddenInput(fixture: ComponentFixture<HostComponent>): HTMLInputElement {
  return fixture.nativeElement.querySelector('input') as HTMLInputElement;
}

async function setup(): Promise<ComponentFixture<HostComponent>> {
  await TestBed.configureTestingModule({
    imports: [HostComponent],
  }).compileComponents();
  const fixture = TestBed.createComponent(HostComponent);
  fixture.detectChanges();
  return fixture;
}

describe('ZOtpInputComponent', () => {
  it('renders one slot per character of the configured length', async () => {
    const fixture = await setup();
    expect(slots(fixture)).toHaveLength(8);

    fixture.componentInstance.length.set(6);
    fixture.detectChanges();
    expect(slots(fixture)).toHaveLength(6);
  });

  it('writes a form-control value into the slots, uppercasing it', async () => {
    const fixture = await setup();

    fixture.componentInstance.control.setValue('abc12345');
    fixture.detectChanges();

    const chars = slots(fixture).map((slot) => slot.textContent?.trim());
    expect(chars).toEqual(['A', 'B', 'C', '1', '2', '3', '4', '5']);
  });

  it('propagates typed input through the CVA as an uppercased value', async () => {
    const fixture = await setup();
    const input = hiddenInput(fixture);

    input.value = 'abc12';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(fixture.componentInstance.control.value).toBe('ABC12');
  });

  it('accepts every character in the Crockford alphabet', async () => {
    const fixture = await setup();
    const crockfordAlphabet = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
    fixture.componentInstance.length.set(crockfordAlphabet.length);
    fixture.detectChanges();
    const input = hiddenInput(fixture);

    input.value = crockfordAlphabet.toLowerCase();
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(fixture.componentInstance.control.value).toBe(crockfordAlphabet);
  });

  it('maps ambiguous I, L, and O input to Crockford digits and rejects U', async () => {
    const fixture = await setup();
    const input = hiddenInput(fixture);

    input.value = 'ilouxyz9';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(fixture.componentInstance.control.value).toBe('110XYZ9');
  });

  it('reflects the invalid input with a danger border on the slots', async () => {
    const fixture = await setup();
    expect(slots(fixture)[0].className).toContain('border-[rgba(38,24,15,0.28)]');

    fixture.componentInstance.invalid.set(true);
    fixture.detectChanges();
    expect(slots(fixture)[0].className).toContain('border-rose-400');
  });

  it('respects the disabled state from the form control', async () => {
    const fixture = await setup();

    fixture.componentInstance.control.disable();
    fixture.detectChanges();

    expect(hiddenInput(fixture).disabled).toBe(true);
    expect(slots(fixture)[0].className).toContain('cursor-not-allowed');
  });
});
