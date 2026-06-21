import { TestBed } from '@angular/core/testing';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { of } from 'rxjs';
import { GroupsApiClient } from '../../core/http/groups-api.service';
import { PermissionsService } from '../../core/permissions/permissions.service';
import { AppShellStore } from '../../core/state/app-shell.store';
import { GroupInvitationsSectionComponent } from './group-invitations-section.component';

describe('GroupInvitationsSectionComponent', () => {
  const invitations = [
    {
      id: 'invite-1',
      code: 'QY92265W',
      delivery: 'link' as const,
      status: 'pending' as const,
      invite_url: 'http://localhost:4200/groups?invite=QY92265W',
      created_at: '2026-06-21T12:00:00Z',
    },
    {
      id: 'invite-2',
      code: 'ABCD2345',
      delivery: 'email' as const,
      email: 'student@example.com',
      status: 'accepted' as const,
      invite_url: 'http://localhost:4200/groups?invite=ABCD2345',
      status_changed_at: '2026-06-21T13:00:00Z',
    },
  ];

  function configure() {
    const api = {
      listGroupInvitations: vi.fn(() => of(invitations)),
      revokeGroupInvitation: vi.fn(() => of(undefined)),
      createGroupInvitation: vi.fn(),
      getGroupInvitationQrCode: vi.fn(),
    };
    const shell = { showToast: vi.fn() };

    TestBed.configureTestingModule({
      imports: [
        GroupInvitationsSectionComponent,
        TranslocoTestingModule.forRoot({
          langs: {
            en: {
              common: { actions: { createInvitation: 'Create invitation', retry: 'Retry' } },
              groups: {
                invitations: {
                  title: 'Group invitations',
                  description: 'Manage invitations.',
                  anyone: 'Anyone with the link',
                  open: 'View',
                  revoke: 'Revoke',
                  revoked: 'Invitation revoked',
                  delivery: { link: 'Reusable', email: 'Direct' },
                  status: { pending: 'Pending', accepted: 'Accepted' },
                  date: { created: 'Created {{date}}', accepted: 'Accepted {{date}}' },
                },
              },
              toast: { successTitle: 'Success' },
            },
          },
          translocoConfig: { availableLangs: ['en'], defaultLang: 'en' },
          preloadLangs: true,
        }),
      ],
      providers: [
        { provide: GroupsApiClient, useValue: api },
        {
          provide: PermissionsService,
          useValue: { hasPermission: () => true },
        },
        { provide: AppShellStore, useValue: shell },
      ],
    });

    return { api, shell };
  }

  it('renders reusable and direct invitations with their statuses', async () => {
    const { api } = configure();
    const fixture = TestBed.createComponent(GroupInvitationsSectionComponent);
    fixture.componentRef.setInput('groupId', 'group-1');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(api.listGroupInvitations).toHaveBeenCalledWith('group-1');
    expect(fixture.nativeElement.textContent).toContain('QY92265W');
    expect(fixture.nativeElement.textContent).toContain('Reusable');
    expect(fixture.nativeElement.textContent).toContain('student@example.com');
    expect(fixture.nativeElement.textContent).toContain('Accepted');
    const rows = fixture.nativeElement.querySelectorAll(
      '[data-testid="group-invitation-row"]',
    ) as NodeListOf<HTMLElement>;
    expect(rows).toHaveLength(2);
    expect(rows[0].className).toBe(rows[1].className);
    expect(
      fixture.nativeElement.querySelectorAll('[data-testid="group-invitation-actions"]'),
    ).toHaveLength(2);
    expect(
      fixture.nativeElement.querySelector('[data-testid="revoke-placeholder"]'),
    ).not.toBeNull();
  });

  it('revokes a pending invitation and reloads the list', () => {
    const { api, shell } = configure();
    const fixture = TestBed.createComponent(GroupInvitationsSectionComponent);
    fixture.componentRef.setInput('groupId', 'group-1');
    fixture.detectChanges();

    (fixture.componentInstance as any).confirmRevoke(true, invitations[0]);

    expect(api.revokeGroupInvitation).toHaveBeenCalledWith('group-1', 'invite-1');
    expect(api.listGroupInvitations).toHaveBeenCalledTimes(2);
    expect(shell.showToast).toHaveBeenCalledWith('Success', 'Invitation revoked', 'success');
  });
});
