import { TestBed } from '@angular/core/testing';
import { ZDropdownMenuComponent } from './z-dropdown-menu.component';

describe('ZDropdownMenuComponent', () => {
  it('points the chevron right when closed and down when open', async () => {
    const fixture = TestBed.createComponent(ZDropdownMenuComponent);
    fixture.componentRef.setInput('label', 'Help');
    fixture.componentRef.setInput('items', [
      { id: 'contact', label: 'Contact', href: 'https://strido.net/en/contact.html' },
    ]);
    fixture.detectChanges();

    const trigger = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    const chevron = trigger.querySelector('.z-dropdown-menu-chevron') as SVGElement;

    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(chevron.classList).toContain('lucide-chevron-right');
    expect(getComputedStyle(chevron).transform).not.toBe('rotate(90deg)');

    trigger.click();
    await new Promise((resolve) => setTimeout(resolve));
    fixture.detectChanges();

    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect(trigger.hasAttribute('data-open')).toBe(true);
    expect(getComputedStyle(chevron).transform).toBe('rotate(90deg)');
  });
});
