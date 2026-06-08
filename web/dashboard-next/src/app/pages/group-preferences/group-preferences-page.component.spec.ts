import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { Subject } from 'rxjs';
import { AppShellStore } from '../../core/state/app-shell.store';
import { Group } from '../../core/http/groups-api.service';
import { GroupsStore } from '../../features/groups/groups.store';
import { SessionStore } from '../../features/session/session.store';
import { GroupPreferencesPageComponent } from './group-preferences-page.component';

const group: Group = {
  id: 'group-1',
  name: 'Academy',
  owner_id: 'user-1',
  avatar: null,
  description: 'Students and experts',
  created_at: '2026-05-16T12:00:00Z',
  updated_at: '2026-05-16T12:00:00Z',
};

describe('GroupPreferencesPageComponent', () => {
  const paramMap = new Subject<ReturnType<typeof convertToParamMap>>();
  const activeGroup = signal<Group | null>(null);
  const currentUser = signal<{ id: string }>({ id: 'user-1' });
  let permissions: string[] = ['groups:preferences:edit', 'groups:delete'];
  const mutationStatus = signal<'idle' | 'loading' | 'success' | 'error'>('idle');
  const mutationError = signal<string | null>(null);
  const router = { navigate: vi.fn() };
  const shell = { showToast: vi.fn() };
  const store = {
    activeGroup,
    detailStatus: () => 'success',
    loadGroup: vi.fn(async () => activeGroup.set(group)),
    mutationError,
    mutationStatus,
    updateGroup: vi.fn(),
    deleteGroup: vi.fn(async () => true),
    leaveGroup: vi.fn(async () => true),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    permissions = ['groups:preferences:edit', 'groups:delete'];
    currentUser.set({ id: 'user-1' });
    mutationStatus.set('idle');
    mutationError.set(null);
    activeGroup.set(null);

    await TestBed.configureTestingModule({
      imports: [
        GroupPreferencesPageComponent,
        TranslocoTestingModule.forRoot({
          langs: {
            en: {
              avatar: {
                invalidImage: 'Invalid image',
                loadFailed: 'Failed to load image',
                readFailed: 'Failed to read file',
                requirement: 'Image required',
                selectImage: 'Select image',
                sizeExceeded: 'Image too large',
              },
              common: {
                actions: { preferences: 'Preferences', save: 'Save' },
                aria: { avatarPreview: 'Avatar preview' },
                fields: { avatar: 'Avatar', description: 'Description' },
                nav: { groups: 'Groups' },
              },
              groups: {
                avatarTitle: 'Group image',
                generalTab: 'General',
                groupName: 'Group Name',
                groupNameRequired: 'Group name is required.',
                namePlaceholder: 'Group name',
                descriptionPlaceholder: 'Group description',
                dangerDescription: 'Dangerous group actions.',
                deleteConfirm: 'Delete this group?',
                deleteDescription: 'Delete this group.',
                deleteGroup: 'Delete Group',
                deleteSummary: 'This cannot be undone.',
                deleteTab: 'Danger Zone',
                deleteThisGroup: 'Delete this group',
                deleteUnavailable: 'No group actions available.',
                preferences: 'Group Preferences',
                updated: 'Group updated successfully',
                leave: {
                  action: 'Leave group',
                  confirm: 'Leave {{group}}.',
                  failed: 'Failed to leave group.',
                  success: 'You left {{group}}.',
                  summary: 'Leave this group and lose access to its videos.',
                  title: 'Leave group?',
                },
                phase4: { preferencesSummary: 'Update group details.' },
              },
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
        {
          provide: ActivatedRoute,
          useValue: { paramMap },
        },
        {
          provide: Router,
          useValue: router,
        },
        {
          provide: GroupsStore,
          useValue: store,
        },
        {
          provide: SessionStore,
          useValue: {
            hasPermission: (permission: string) => permissions.includes(permission),
            user: currentUser,
          },
        },
        {
          provide: AppShellStore,
          useValue: shell,
        },
      ],
    }).compileComponents();
  });

  it('does not reload group data when only the active tab changes', async () => {
    const fixture = TestBed.createComponent(GroupPreferencesPageComponent);
    fixture.detectChanges();

    paramMap.next(convertToParamMap({ id: 'group-1', tab: 'general' }));
    await fixture.whenStable();
    fixture.detectChanges();

    paramMap.next(convertToParamMap({ id: 'group-1', tab: 'delete' }));
    await Promise.resolve();
    fixture.detectChanges();

    expect(store.loadGroup).toHaveBeenCalledTimes(1);
    expect(fixture.componentInstance['activeTab']()).toBe('delete');
  });

  it('shows a translated inline error for a dirty invalid group name', async () => {
    const fixture = TestBed.createComponent(GroupPreferencesPageComponent);
    fixture.detectChanges();

    paramMap.next(convertToParamMap({ id: 'group-1', tab: 'general' }));
    await Promise.resolve();
    fixture.componentInstance['form'].controls.name.setValue('');
    fixture.componentInstance['form'].controls.name.markAsDirty();
    fixture.detectChanges();

    const error = fixture.nativeElement.querySelector('#group-preferences-name-error');
    const input = fixture.nativeElement.querySelector('z-text-input input');

    expect(error?.textContent).toContain('Group name is required.');
    expect(input?.getAttribute('aria-invalid')).toBe('true');
  });

  it('enables save only while group details differ from the saved values', async () => {
    const fixture = TestBed.createComponent(GroupPreferencesPageComponent);
    fixture.detectChanges();

    paramMap.next(convertToParamMap({ id: 'group-1', tab: 'general' }));
    await Promise.resolve();
    fixture.detectChanges();

    const button = () => fixture.nativeElement.querySelector('button[type="submit"]');

    expect(button().disabled).toBe(true);

    fixture.componentInstance['form'].controls.name.setValue('Academy Plus');
    await fixture.whenStable();
    fixture.detectChanges();

    expect(button().disabled).toBe(false);

    fixture.componentInstance['form'].controls.name.setValue('Academy');
    await fixture.whenStable();
    fixture.detectChanges();

    expect(button().disabled).toBe(true);
  });

  it('lets a non-owner leave from the danger zone', async () => {
    permissions = ['groups:membership:leave'];
    currentUser.set({ id: 'student-1' });
    activeGroup.set({ ...group, owner_id: 'expert-1' });
    const fixture = TestBed.createComponent(GroupPreferencesPageComponent);
    fixture.detectChanges();

    paramMap.next(convertToParamMap({ id: 'group-1', tab: 'delete' }));
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Leave group');
    expect(fixture.componentInstance['activeTab']()).toBe('delete');

    await fixture.componentInstance['confirmLeave'](true);

    expect(store.leaveGroup).toHaveBeenCalledWith('group-1');
    expect(shell.showToast).toHaveBeenCalledWith('Success', 'You left Academy.', 'success');
    expect(router.navigate).toHaveBeenCalledWith(['/groups']);
  });
});
