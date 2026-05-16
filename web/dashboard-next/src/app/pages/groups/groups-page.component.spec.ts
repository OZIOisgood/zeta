import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { of } from 'rxjs';
import { GroupsApiClient } from '../../core/http/groups-api.service';
import { GroupsPageComponent } from './groups-page.component';

describe('GroupsPageComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        GroupsPageComponent,
        TranslocoTestingModule.forRoot({
          langs: {
            en: {
              common: { actions: { retry: 'Retry' } },
              groups: {
                createFirst: 'Create your first group',
                createFirstDescription: 'Get started by creating a group for your students.',
                createNew: 'Create a new group',
                myGroups: 'My Groups',
                noGroupsYet: 'No groups yet',
                phase4: {
                  loadFailed: 'Groups could not be loaded',
                  noDescription: 'No description was added for this group.',
                  summary: 'Browse coaching groups.',
                },
              },
              home: { error: { badge: 'Fallback state' } },
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
          useValue: {
            listGroups: () =>
              of([
                {
                  id: 'group-1',
                  name: 'Academy',
                  owner_id: 'user-1',
                  avatar: null,
                  description: 'Students and experts',
                  created_at: '2026-05-16T12:00:00Z',
                  updated_at: '2026-05-16T12:00:00Z',
                },
              ]),
          },
        },
      ],
    }).compileComponents();
  });

  it('renders loaded group rows', async () => {
    const fixture = TestBed.createComponent(GroupsPageComponent);

    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('My Groups');
    expect(fixture.nativeElement.textContent).toContain('Academy');
    expect(fixture.nativeElement.textContent).toContain('Students and experts');
  });
});
