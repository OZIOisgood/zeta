import { TestBed } from '@angular/core/testing';
import { ZComboboxComponent } from './z-combobox.component';

describe('ZComboboxComponent', () => {
  it('renders the selected value through a button without an editable input', () => {
    const fixture = TestBed.createComponent(ZComboboxComponent);

    fixture.componentRef.setInput('options', [
      { value: 'en', label: 'English' },
      { value: 'de', label: 'German' },
    ]);
    fixture.componentRef.setInput('value', 'en');
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('button').textContent).toContain('English');
    expect(fixture.nativeElement.querySelector('input')).toBeNull();
  });
});
