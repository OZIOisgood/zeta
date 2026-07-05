import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { of } from 'rxjs';
import { AppShellStore } from '../../core/state/app-shell.store';
import { GroupsApiClient } from '../../core/http/groups-api.service';
import { PermissionsService } from '../../core/permissions/permissions.service';
import { SessionStore } from '../../features/session/session.store';
import { GroupDetailsPageComponent } from './group-details-page.component';

const group = {
  id: 'group-1',
  name: 'Academy',
  owner_id: 'owner-1',
  avatar: null,
  description: 'Students and experts',
  created_at: '2026-05-16T12:00:00Z',
  updated_at: '2026-05-16T12:00:00Z',
};

describe('GroupDetailsPageComponent', () => {
  function configure(permissions: string[]) {
    const groupsApi = {
      getGroup: vi.fn(() => of(group)),
      listGroupInvitations: vi.fn(() => of([])),
      createGroupInvitation: vi.fn(() =>
        of({
          id: 'invite-1',
          code: 'ABC12345',
          delivery: 'link',
          status: 'pending',
          invite_url: 'http://localhost:4200/groups?invite=ABC12345',
        }),
      ),
      revokeGroupInvitation: vi.fn(() => of(undefined)),
      getGroupInvitationQrCode: vi.fn(() => of(new Blob())),
      listGroupMembers: vi.fn((_groupId: string, kind: 'students' | 'experts') =>
        of(
          kind === 'students'
            ? [
                {
                  id: 'student-1',
                  display_name: 'Student O.',
                  full_name: 'Student One',
                  avatar: '',
                  role: 'student',
                  name: 'Student O.',
                },
              ]
            : [
                {
                  id: 'expert-1',
                  display_name: 'Expert One',
                  avatar: '',
                  role: 'expert',
                  name: 'Expert One',
                },
              ],
        ),
      ),
      removeGroupMember: vi.fn(() => of(undefined)),
    };

    TestBed.configureTestingModule({
      imports: [
        GroupDetailsPageComponent,
        TranslocoTestingModule.forRoot({
          langs: {
            en: {
              common: {
                actions: {
                  cancel: 'Cancel',
                  invite: 'Invite',
                  preferences: 'Preferences',
                  remove: 'Remove',
                  retry: 'Retry',
                  createInvitation: 'Create invitation',
                },
                nav: { groups: 'Groups' },
              },
              groups: {
                createInvitationTitle: 'Create Invitation',
                experts: 'Experts',
                expertsDescription: 'People who can review videos.',
                inviteStudent: 'Invite student',
                inviteStudents: 'Invite students to join this group.',
                inviteDialog: {
                  cardDescription: 'Create a shareable link or QR code.',
                },
                invitations: {
                  title: 'Group invitations',
                  description: 'Manage invitations to this group.',
                  empty: 'No invitations yet',
                  emptyDescription: 'New invitations will appear here.',
                },
                membersUnavailable: 'Member lists are not available',
                membersUnavailableDescription: 'No permission to view members.',
                noExperts: 'No experts yet',
                noExpertsDescription: 'Experts will appear here.',
                noStudents: 'No students yet',
                preferences: 'Group Preferences',
                roles: { expert: 'Expert', student: 'Student' },
                students: 'Students',
                studentsDescription: 'Students in this group.',
                users: {
                  confirmRemove: 'Remove {{name}}?',
                  removed: '{{name}} removed',
                  removeFailed: 'Failed to remove user',
                  removeUser: 'Remove User',
                },
                phase4: { noDescription: 'No description.' },
              },
              home: { error: { description: 'Something went wrong' } },
              toast: { errorTitle: 'Error', successTitle: 'Success' },
            },
          },
          translocoConfig: {
            availableLangs: ['en'],
            defaultLang: 'en',
          },
          preloadLangs: true,
        }),
      ],
      providers: [
        provideRouter([]),
        {
          provide: GroupsApiClient,
          useValue: groupsApi,
        },
        {
          provide: PermissionsService,
          useValue: { hasPermission: (permission: string) => permissions.includes(permission) },
        },
        {
          provide: SessionStore,
          useValue: { user: () => ({ id: 'current-user' }) },
        },
        {
          provide: AppShellStore,
          useValue: { showToast: vi.fn() },
        },
        {
          provide: ActivatedRoute,
          useValue: { paramMap: of(convertToParamMap({ id: group.id })) },
        },
      ],
    });

    return groupsApi;
  }

  it('renders permitted student and expert lists', async () => {
    const groupsApi = configure([
      'groups:user-list:read',
      'groups:expert-list:read',
      'groups:invites:create',
      'groups:invites:read',
      'groups:invites:revoke',
      'groups:user-list:delete',
    ]);

    const fixture = TestBed.createComponent(GroupDetailsPageComponent);
    await fixture.whenStable();
    fixture.detectChanges();

    expect(groupsApi.listGroupMembers).toHaveBeenCalledWith(group.id, 'students');
    expect(groupsApi.listGroupMembers).toHaveBeenCalledWith(group.id, 'experts');
    expect(fixture.nativeElement.textContent).toContain('Student O.');
    expect(fixture.nativeElement.textContent).toContain('Student One');
    expect(fixture.nativeElement.textContent).toContain('Expert One');
    expect(fixture.nativeElement.textContent).not.toContain('student@example.com');
    expect(fixture.nativeElement.textContent).not.toContain('expert@example.com');
    expect(groupsApi.listGroupInvitations).toHaveBeenCalledWith(group.id);
    expect(fixture.nativeElement.textContent).toContain('Group invitations');
  });

  it('hides member lists without granular member permissions', async () => {
    configure([]);

    const fixture = TestBed.createComponent(GroupDetailsPageComponent);
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Member lists are not available');
    expect(fixture.nativeElement.textContent).not.toContain('Student One');
    expect(fixture.nativeElement.textContent).not.toContain('Expert One');
  });
});
