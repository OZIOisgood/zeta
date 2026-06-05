import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { DashboardDateTimeService } from '../../core/i18n/dashboard-date-time.service';
import { NotificationItem } from '../../core/http/notifications-api.service';
import { NotificationListComponent } from './notification-list.component';
import { NotificationDayGroup } from './notifications.store';

const LANG = {
  notifications: {
    today: 'Today',
    earlier: 'Earlier',
    unread: 'Unread',
    empty: 'No notifications yet',
    emptyDescription: 'You are all caught up.',
    invite: {
      accept: 'Accept',
      decline: 'Decline',
      accepted: 'Accepted',
      declined: 'Declined',
    },
    types: {
      groupInvitationReceived: '{{inviter}} invited you to {{group}}',
      groupMemberJoined: '{{member}} joined {{group}}',
    },
  },
};

function inviteItem(overrides: Partial<NotificationItem> = {}): NotificationItem {
  return {
    id: 'inv1',
    type: 'group_invitation_received',
    payload: { group_name: 'Academy', inviter_name: 'Sofia', code: 'ZP-1' },
    read: false,
    created_at: '2026-06-05T10:00:00Z',
    ...overrides,
  };
}

function groupsWith(items: NotificationItem[]): NotificationDayGroup[] {
  return [{ key: 'today', labelKey: 'notifications.today', items }];
}

async function setup() {
  await TestBed.configureTestingModule({
    imports: [
      NotificationListComponent,
      TranslocoTestingModule.forRoot({
        langs: { en: LANG },
        translocoConfig: { availableLangs: ['en'], defaultLang: 'en' },
        preloadLangs: true,
      }),
    ],
    providers: [
      provideRouter([]),
      { provide: DashboardDateTimeService, useValue: { formatRelative: () => 'just now' } },
    ],
  }).compileComponents();

  return TestBed.createComponent(NotificationListComponent);
}

describe('NotificationListComponent', () => {
  it('renders Accept/Decline for an unresolved invite and emits accept on press', async () => {
    const fixture = await setup();
    fixture.componentRef.setInput('groups', groupsWith([inviteItem()]));
    fixture.detectChanges();

    let accepted: NotificationItem | undefined;
    fixture.componentInstance.accept.subscribe((item) => (accepted = item));

    const buttons = Array.from(
      fixture.nativeElement.querySelectorAll('button'),
    ) as HTMLButtonElement[];
    const acceptBtn = buttons.find((b) => b.textContent?.trim() === 'Accept');
    expect(acceptBtn).toBeTruthy();
    expect(buttons.some((b) => b.textContent?.trim() === 'Decline')).toBe(true);

    acceptBtn!.click();
    expect(accepted?.id).toBe('inv1');
  });

  it('hides invite actions and shows the resolved label once accepted', async () => {
    const fixture = await setup();
    fixture.componentRef.setInput('groups', groupsWith([inviteItem({ inviteState: 'accepted' })]));
    fixture.detectChanges();

    const buttons = Array.from(
      fixture.nativeElement.querySelectorAll('button'),
    ) as HTMLButtonElement[];
    expect(buttons.some((b) => b.textContent?.trim() === 'Accept')).toBe(false);
    expect(fixture.nativeElement.textContent).toContain('Accepted');
  });

  it('hides invite actions when the server reports the invite already resolved', async () => {
    const fixture = await setup();
    // No optimistic client state — only the server-reported status (e.g. after reload).
    fixture.componentRef.setInput(
      'groups',
      groupsWith([inviteItem({ invite_status: 'accepted' })]),
    );
    fixture.detectChanges();

    const buttons = Array.from(
      fixture.nativeElement.querySelectorAll('button'),
    ) as HTMLButtonElement[];
    expect(buttons.some((b) => b.textContent?.trim() === 'Accept')).toBe(false);
    expect(fixture.nativeElement.textContent).toContain('Accepted');
  });

  it('shows the empty state when there are no groups', async () => {
    const fixture = await setup();
    fixture.componentRef.setInput('groups', []);
    fixture.componentRef.setInput('emptyTitle', 'No notifications yet');
    fixture.componentRef.setInput('emptyDescription', 'You are all caught up.');
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('z-empty-state')).toBeTruthy();
    expect(fixture.nativeElement.textContent).toContain('No notifications yet');
  });

  it('renders skeletons while loading', async () => {
    const fixture = await setup();
    fixture.componentRef.setInput('groups', []);
    fixture.componentRef.setInput('loading', true);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('z-skeleton').length).toBeGreaterThan(0);
    expect(fixture.nativeElement.querySelector('z-empty-state')).toBeFalsy();
  });
});
