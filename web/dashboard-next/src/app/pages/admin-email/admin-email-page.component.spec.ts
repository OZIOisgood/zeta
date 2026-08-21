import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { provideExitAnimationManager } from 'ng-primitives/internal';
import { of } from 'rxjs';
import {
  AdminEmailApiClient,
  AdminEmailDetail,
  AdminEmailSummary,
} from '../../core/http/admin-email-api.service';
import { DashboardDateTimeService } from '../../core/i18n/dashboard-date-time.service';
import { PermissionsService } from '../../core/permissions/permissions.service';
import { AppShellStore } from '../../core/state/app-shell.store';
import { AdminEmailPageComponent } from './admin-email-page.component';

const summary: AdminEmailSummary = {
  id: '01020304-0506-0708-090a-0b0c0d0e0f10',
  inbox: 'social',
  inbox_address: 'social@strido.net',
  sender: 'Shannon <shannon@example.com>',
  sender_name: 'Shannon',
  subject: 'Partnership question',
  preview: 'Hello Strido',
  received_at: '2026-08-21T12:00:00Z',
  handling_status: 'open',
  read_at: '2026-08-21T12:05:00Z',
  attachment_count: 0,
};

const detail: AdminEmailDetail = {
  ...summary,
  recipients: ['social@strido.net'],
  cc: [],
  body_text: 'Hello Strido',
  attachments: [],
  replies: [],
};

describe('AdminEmailPageComponent', () => {
  let fixture: ComponentFixture<AdminEmailPageComponent>;
  let list: ReturnType<typeof vi.fn>;
  let get: ReturnType<typeof vi.fn>;
  let reply: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    list = vi.fn(() => of({ items: [summary], total: 1 }));
    get = vi.fn(() => of(detail));
    reply = vi.fn(() =>
      of({
        id: 'reply-1',
        from_address: 'social@strido.net',
        to_address: 'shannon@example.com',
        subject: 'Re: Partnership question',
        body_text: 'Thanks',
        sender_user_id: 'admin-1',
        sender_display_name: 'Admin',
        delivery_status: 'sent' as const,
        sent_at: '2026-08-21T12:10:00Z',
        created_at: '2026-08-21T12:10:00Z',
      }),
    );

    await TestBed.configureTestingModule({
      imports: [
        AdminEmailPageComponent,
        TranslocoTestingModule.forRoot({
          langs: {
            en: {
              adminEmail: {
                title: 'Email inbox',
                description: 'Manage email',
                refresh: 'Refresh',
                total: '{{count}} messages',
                messageList: 'Messages',
                unread: 'Unread',
                status: 'Status',
                attachments: 'Attachments',
                replies: 'Replies',
                replyFailed: 'Failed',
                closedMessage: 'Closed',
                filters: {
                  inbox: 'Inbox',
                  status: 'Status',
                  allInboxes: 'All inboxes',
                  allStatuses: 'All statuses',
                },
                inboxes: { support: 'Support', social: 'Social', dsa: 'DSA' },
                statuses: { open: 'Open', replied: 'Replied', closed: 'Closed' },
                compose: {
                  title: 'Write a reply',
                  from: 'From {{address}}',
                  placeholder: 'Write',
                  send: 'Send reply',
                  sending: 'Sending',
                },
                empty: { title: 'Empty', description: 'Empty' },
                errors: {
                  listTitle: 'Error',
                  listDescription: 'Error',
                  detailTitle: 'Error',
                  detailDescription: 'Error',
                  sendDescription: 'Error',
                  statusDescription: 'Error',
                },
                toast: {
                  sentTitle: 'Sent',
                  sentDescription: 'Sent',
                  statusTitle: 'Saved',
                  statusDescription: 'Saved',
                  errorTitle: 'Error',
                },
              },
            },
          },
          translocoConfig: { availableLangs: ['en'], defaultLang: 'en' },
          preloadLangs: true,
        }),
      ],
      providers: [
        provideHttpClient(),
        provideRouter([]),
        provideExitAnimationManager(),
        {
          provide: AdminEmailApiClient,
          useValue: {
            list,
            get,
            update: vi.fn(() => of(summary)),
            reply,
            attachmentUrl: vi.fn(() => '/attachment'),
          },
        },
        {
          provide: DashboardDateTimeService,
          useValue: { formatInstantDateTime: () => '21 Aug 2026' },
        },
        {
          provide: PermissionsService,
          useValue: { hasPermission: (permission: string) => permission === 'inbound-email:reply' },
        },
        {
          provide: AppShellStore,
          useValue: { showToast: vi.fn() },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminEmailPageComponent);
    fixture.detectChanges();
    await vi.waitFor(() => expect(get).toHaveBeenCalledWith(summary.id));
    await new Promise((resolve) => setTimeout(resolve, 0));
    fixture.detectChanges();
  });

  it('loads a multi-inbox message and shows the reply sender address', () => {
    expect(list).toHaveBeenCalled();
    expect(get).toHaveBeenCalledWith(summary.id);
    expect(fixture.nativeElement.textContent).toContain('Partnership question');
    expect(fixture.nativeElement.textContent).toContain('social@strido.net');
    expect(fixture.nativeElement.textContent).toContain('Write a reply');
  });

  it('sends the composed reply for the selected inbox message', async () => {
    const textarea = fixture.nativeElement.querySelector('textarea') as HTMLTextAreaElement;
    textarea.value = 'Thanks for contacting us.';
    textarea.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    const form = fixture.nativeElement.querySelector('form') as HTMLFormElement;
    form.dispatchEvent(new Event('submit', { cancelable: true }));
    await fixture.whenStable();

    expect(reply).toHaveBeenCalledWith(
      summary.id,
      'Thanks for contacting us.',
      expect.stringMatching(/^[0-9a-f-]{36}$/),
    );
  });
});
