import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { GroupsApiClient } from '../../core/http/groups-api.service';
import { GroupsStore } from './groups.store';

describe('GroupsStore', () => {
  it('loads groups and derives group presence', async () => {
    TestBed.configureTestingModule({
      providers: [
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
                  description: null,
                  created_at: '2026-05-16T12:00:00Z',
                  updated_at: '2026-05-16T12:00:00Z',
                },
              ]),
          },
        },
      ],
    });

    const store = TestBed.inject(GroupsStore);

    await store.loadGroups();

    expect(store.status()).toBe('success');
    expect(store.groupCount()).toBe(1);
    expect(store.hasGroups()).toBe(true);
  });
});
