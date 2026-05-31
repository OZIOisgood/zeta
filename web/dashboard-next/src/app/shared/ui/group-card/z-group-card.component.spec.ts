import { TestBed } from '@angular/core/testing';
import { Group } from '../../../core/http/groups-api.service';
import { ZGroupCardComponent } from './z-group-card.component';

const group = (description: string): Group => ({
  id: 'group-1',
  name: 'Arena Academy',
  owner_id: 'user-1',
  avatar: null,
  description,
  created_at: '2026-05-31T00:00:00Z',
  updated_at: '2026-05-31T00:00:00Z',
});

describe('ZGroupCardComponent', () => {
  it('keeps card content top-aligned and trims long descriptions', async () => {
    const fixture = TestBed.createComponent(ZGroupCardComponent);
    const description =
      'Weekly training sessions, student submissions, coaching notes, availability planning, and detailed rider feedback for everyone in the academy group.';

    fixture.componentRef.setInput('group', group(description));
    fixture.detectChanges();
    await fixture.whenStable();

    const content = fixture.nativeElement.querySelector('div');
    const renderedText = fixture.nativeElement.textContent;

    expect(content.classList).toContain('items-start');
    expect(renderedText).toContain('...');
    expect(renderedText).not.toContain(description);
  });

  it('renders a selected treatment for booking flows', () => {
    const fixture = TestBed.createComponent(ZGroupCardComponent);

    fixture.componentRef.setInput('group', group('Weekly training sessions.'));
    fixture.componentRef.setInput('selected', true);
    fixture.detectChanges();

    expect(fixture.nativeElement.classList).toContain('border-[var(--z-primary)]');
  });
});
