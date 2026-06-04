import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { CoachingApiClient } from '../../core/http/coaching-api.service';
import { Group, GroupsApiClient } from '../../core/http/groups-api.service';
import { AvailabilityStore } from './availability.store';

const group: Group = {
  id: 'group-1',
  name: 'Arena group',
  owner_id: 'expert-1',
  avatar: null,
  description: null,
  created_at: '2026-05-19T10:00:00Z',
  updated_at: '2026-05-19T10:00:00Z',
};

describe('AvailabilityStore', () => {
  it('loads group configuration and appends created session types', async () => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: GroupsApiClient,
          useValue: {
            listGroups: () => of([group]),
          },
        },
        {
          provide: CoachingApiClient,
          useValue: {
            listSessionTypes: () => of([]),
            listMyAvailability: () => of([]),
            listBlockedSlots: () => of([]),
            createSessionType: () =>
              of({
                id: 'type-1',
                expert_id: 'expert-1',
                group_id: 'group-1',
                name: 'Strategy',
                description: '',
                duration_minutes: 45,
                is_active: true,
                created_at: '2026-05-19T10:00:00Z',
                updated_at: '2026-05-19T10:00:00Z',
              }),
          },
        },
      ],
    });

    const store = TestBed.inject(AvailabilityStore);

    await store.loadGroups('group-1');
    await store.createSessionType({ name: 'Strategy', description: '', duration_minutes: 45 });

    expect(store.activeGroup()?.id).toBe('group-1');
    expect(store.sessionTypes()[0].name).toBe('Strategy');
  });

  it('replaces availability with the merged list returned by the API', async () => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: GroupsApiClient,
          useValue: {
            listGroups: () => of([group]),
          },
        },
        {
          provide: CoachingApiClient,
          useValue: {
            listSessionTypes: () => of([]),
            listMyAvailability: () => of([]),
            listBlockedSlots: () => of([]),
            createAvailability: () =>
              of([
                {
                  id: 'availability-1',
                  expert_id: 'expert-1',
                  group_id: 'group-1',
                  day_of_week: 3,
                  start_time: '09:00',
                  end_time: '17:00',
                  is_active: true,
                  created_at: '2026-05-19T10:00:00Z',
                },
              ]),
          },
        },
      ],
    });

    const store = TestBed.inject(AvailabilityStore);

    await store.loadGroups('group-1');
    await store.createAvailability({
      day_of_week: 3,
      start_time: '09:00',
      end_time: '17:00',
    });

    expect(store.availability()).toEqual([
      expect.objectContaining({
        day_of_week: 3,
        start_time: '09:00',
        end_time: '17:00',
      }),
    ]);
  });

  it('clears the active group when loading the settings chooser route', async () => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: GroupsApiClient,
          useValue: {
            listGroups: () => of([group]),
          },
        },
        {
          provide: CoachingApiClient,
          useValue: {
            listSessionTypes: () =>
              of([
                {
                  id: 'type-1',
                  expert_id: 'expert-1',
                  group_id: 'group-1',
                  name: 'Strategy',
                  description: '',
                  duration_minutes: 45,
                  is_active: true,
                  created_at: '2026-05-19T10:00:00Z',
                  updated_at: '2026-05-19T10:00:00Z',
                },
              ]),
            listMyAvailability: () =>
              of([
                {
                  id: 'availability-1',
                  expert_id: 'expert-1',
                  group_id: 'group-1',
                  day_of_week: 3,
                  start_time: '09:00',
                  end_time: '17:00',
                  is_active: true,
                  created_at: '2026-05-19T10:00:00Z',
                },
              ]),
            listBlockedSlots: () => of([]),
          },
        },
      ],
    });

    const store = TestBed.inject(AvailabilityStore);

    await store.loadGroups('group-1');
    await store.loadGroups();

    expect(store.activeGroup()).toBeNull();
    expect(store.groups()).toEqual([group]);
    expect(store.sessionTypes()).toEqual([]);
    expect(store.availability()).toEqual([]);
    expect(store.blockedSlots()).toEqual([]);
  });
});
