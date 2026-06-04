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
  const store = {
    activeGroup,
    detailStatus: () => 'success',
    loadGroup: vi.fn(async () => activeGroup.set(group)),
    mutationError: () => null,
    mutationStatus: () => 'idle',
    updateGroup: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
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
                preferences: 'Group Preferences',
                updated: 'Group updated successfully',
                phase4: { preferencesSummary: 'Update group details.' },
              },
              toast: { successTitle: 'Success' },
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
          useValue: { navigate: vi.fn() },
        },
        {
          provide: GroupsStore,
          useValue: store,
        },
        {
          provide: SessionStore,
          useValue: {
            hasPermission: () => true,
            user: () => ({ id: 'user-1' }),
          },
        },
        {
          provide: AppShellStore,
          useValue: { showToast: vi.fn() },
        },
      ],
    }).compileComponents();
  });

  it('does not reload group data when only the active tab changes', async () => {
    const fixture = TestBed.createComponent(GroupPreferencesPageComponent);
    fixture.detectChanges();

    paramMap.next(convertToParamMap({ id: 'group-1', tab: 'general' }));
    await Promise.resolve();
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
});
