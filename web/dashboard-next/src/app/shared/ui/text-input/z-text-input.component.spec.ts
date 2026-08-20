import { TestBed } from '@angular/core/testing';
import { ZTextInputComponent } from './z-text-input.component';

describe('ZTextInputComponent', () => {
  it('forwards numeric range and increment attributes', () => {
    const fixture = TestBed.createComponent(ZTextInputComponent);
    fixture.componentRef.setInput('type', 'number');
    fixture.componentRef.setInput('min', 15);
    fixture.componentRef.setInput('max', 120);
    fixture.componentRef.setInput('step', 5);
    fixture.detectChanges();

    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    expect(input.min).toBe('15');
    expect(input.max).toBe('120');
    expect(input.step).toBe('5');
  });
});
