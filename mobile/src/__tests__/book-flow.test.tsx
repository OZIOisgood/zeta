import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

// ── native module mocks (must precede any import that touches them) ────────────

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => undefined),
  deleteItemAsync: jest.fn(async () => undefined),
}));

jest.mock('expo-localization', () => ({ getLocales: () => [{ languageCode: 'en' }] }));

// ── hook mocks ────────────────────────────────────────────────────────────────

const mockUseGroupsQuery = jest.fn();
const mockUseCoachingExpertsQuery = jest.fn();
const mockUseSessionTypesQuery = jest.fn();
const mockUseSlotsQuery = jest.fn();
const mockMutateAsync = jest.fn();
const mockUseCreateBookingMutation = jest.fn();

jest.mock('../api/queries/groups', () => ({
  ...jest.requireActual('../api/queries/groups'),
  useGroupsQuery: () => mockUseGroupsQuery(),
}));

jest.mock('../api/queries/coaching', () => ({
  ...jest.requireActual('../api/queries/coaching'),
  useCoachingExpertsQuery: (groupId: string) => mockUseCoachingExpertsQuery(groupId),
  useSessionTypesQuery: (groupId: string) => mockUseSessionTypesQuery(groupId),
  useSlotsQuery: (groupId: string, expertId: string, sessionTypeId: string) =>
    mockUseSlotsQuery(groupId, expertId, sessionTypeId),
  useCreateBookingMutation: (groupId: string) => mockUseCreateBookingMutation(groupId),
}));

// ── router mock ───────────────────────────────────────────────────────────────

const mockBack = jest.fn();
const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: mockBack, replace: mockReplace }),
}));

// ── i18n + component imports (after mocks) ────────────────────────────────────

import { initI18n } from '../i18n';
import BookScreen from '../app/book';

import type { CoachingExpert, CoachingSlot, SessionType } from '../api/queries/coaching';
import { BookingError } from '../api/queries/coaching';
import type { Group } from '../api/queries/groups';

beforeAll(() => initI18n('en'));

// ── test data ─────────────────────────────────────────────────────────────────

const GROUP_A: Group = { id: 'g1', name: 'Group Alpha' } as Group;

const EXPERT_1: CoachingExpert = {
  expert_id: 'e1',
  first_name: 'Alice',
  last_name: 'Smith',
};

const EXPERT_2: CoachingExpert = {
  expert_id: 'e2',
  first_name: 'Bob',
  last_name: 'Jones',
};

const SESSION_TYPE_1: SessionType = {
  id: 'st1',
  expert_id: 'e1',
  group_id: 'g1',
  name: 'Strategy Session',
  description: 'A deep strategy session.',
  duration_minutes: 60,
  is_active: true,
  created_at: '2026-01-01T00:00:00Z',
};

const SESSION_TYPE_2: SessionType = {
  id: 'st2',
  expert_id: 'e2',
  group_id: 'g1',
  name: 'Quick Check',
  description: 'A quick 30 min check-in.',
  duration_minutes: 30,
  is_active: true,
  created_at: '2026-01-01T00:00:00Z',
};

const SLOT_1: CoachingSlot = {
  expert_id: 'e1',
  starts_at: '2026-06-20T09:00:00Z',
  ends_at: '2026-06-20T10:00:00Z',
  duration_minutes: 60,
};

const SLOT_2: CoachingSlot = {
  expert_id: 'e1',
  starts_at: '2026-06-20T11:00:00Z',
  ends_at: '2026-06-20T12:00:00Z',
  duration_minutes: 60,
};

// ── helpers ───────────────────────────────────────────────────────────────────

function idleHook() {
  return { data: undefined, isPending: false, isError: false };
}

function dataHook<T>(data: T) {
  return { data, isPending: false, isError: false };
}

let client: QueryClient;
beforeEach(() => {
  mockBack.mockClear();
  mockReplace.mockClear();
  mockMutateAsync.mockClear();
  mockUseGroupsQuery.mockReset();
  mockUseCoachingExpertsQuery.mockReset();
  mockUseSessionTypesQuery.mockReset();
  mockUseSlotsQuery.mockReset();
  mockUseCreateBookingMutation.mockReset();

  // Safe defaults — every hook returns idle so tests opt in to what they need
  mockUseGroupsQuery.mockReturnValue(idleHook());
  mockUseCoachingExpertsQuery.mockReturnValue(idleHook());
  mockUseSessionTypesQuery.mockReturnValue(idleHook());
  mockUseSlotsQuery.mockReturnValue(idleHook());
  mockUseCreateBookingMutation.mockReturnValue({ mutateAsync: mockMutateAsync, isPending: false });

  client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
});
afterEach(async () => {
  // Drain any pending async work before cleanup to prevent overlapping act() pollution
  await act(async () => {});
  await cleanup();
  client.clear();
});

// Providers is passed `client` as a prop so each test's fresh QueryClient
// is properly used even with RNTL's global screen state.
function Providers({ client: c, children }: { client: QueryClient; children: ReactNode }) {
  return <QueryClientProvider client={c}>{children}</QueryClientProvider>;
}

// ── Test 1: single group auto-selects ─────────────────────────────────────────

test('single group auto-selected: expert step immediately active', async () => {
  mockUseGroupsQuery.mockReturnValue(dataHook([GROUP_A]));
  mockUseCoachingExpertsQuery.mockReturnValue(dataHook([EXPERT_1, EXPERT_2]));
  mockUseSessionTypesQuery.mockReturnValue(dataHook([SESSION_TYPE_1, SESSION_TYPE_2]));
  mockUseSlotsQuery.mockReturnValue(idleHook());

  await render(<Providers client={client}><BookScreen /></Providers>);

  // Expert chips visible without pressing any group chip
  await waitFor(() => {
    expect(screen.getByTestId('book-expert-e1')).toBeOnTheScreen();
    expect(screen.getByTestId('book-expert-e2')).toBeOnTheScreen();
  });
});

// ── Test 2: selecting expert + session type fires slots query ──────────────────

test('selecting expert then session type calls useSlotsQuery with all three ids', async () => {
  mockUseGroupsQuery.mockReturnValue(dataHook([GROUP_A]));
  mockUseCoachingExpertsQuery.mockReturnValue(dataHook([EXPERT_1]));
  mockUseSessionTypesQuery.mockReturnValue(dataHook([SESSION_TYPE_1]));
  // Slots query starts gated, then returns slots after both selections
  mockUseSlotsQuery.mockReturnValue(dataHook([SLOT_1, SLOT_2]));

  await render(<Providers client={client}><BookScreen /></Providers>);

  // Wait for experts to show up (auto-group selected)
  await waitFor(() => expect(screen.getByTestId('book-expert-e1')).toBeOnTheScreen());

  // Select expert
  fireEvent.press(screen.getByTestId('book-expert-e1'));

  // Wait for session type to appear
  await waitFor(() => expect(screen.getByTestId('book-type-st1')).toBeOnTheScreen());

  // Select session type
  fireEvent.press(screen.getByTestId('book-type-st1'));

  // Verify useSlotsQuery was called with the right ids
  await waitFor(() => {
    const calls = mockUseSlotsQuery.mock.calls;
    const matchingCall = calls.find(
      ([gid, eid, stid]: [string, string, string]) =>
        gid === 'g1' && eid === 'e1' && stid === 'st1',
    );
    expect(matchingCall).toBeTruthy();
  });

  // Slot chips visible
  await waitFor(() => {
    expect(screen.getByTestId(`book-slot-${SLOT_1.starts_at}`)).toBeOnTheScreen();
    expect(screen.getByTestId(`book-slot-${SLOT_2.starts_at}`)).toBeOnTheScreen();
  });
});

// ── Test 3: full flow → mutateAsync called → success screen ───────────────────

test('full flow: pick slot → confirm section → submit → mutateAsync called → success screen', async () => {
  mockUseGroupsQuery.mockReturnValue(dataHook([GROUP_A]));
  mockUseCoachingExpertsQuery.mockReturnValue(dataHook([EXPERT_1]));
  mockUseSessionTypesQuery.mockReturnValue(dataHook([SESSION_TYPE_1]));
  mockUseSlotsQuery.mockReturnValue(dataHook([SLOT_1]));
  mockMutateAsync.mockResolvedValueOnce({ id: 'booking-1' });

  await render(<Providers client={client}><BookScreen /></Providers>);

  // Expert auto-available (single group)
  await waitFor(() => expect(screen.getByTestId('book-expert-e1')).toBeOnTheScreen());
  fireEvent.press(screen.getByTestId('book-expert-e1'));

  await waitFor(() => expect(screen.getByTestId('book-type-st1')).toBeOnTheScreen());
  fireEvent.press(screen.getByTestId('book-type-st1'));

  await waitFor(() =>
    expect(screen.getByTestId(`book-slot-${SLOT_1.starts_at}`)).toBeOnTheScreen(),
  );
  fireEvent.press(screen.getByTestId(`book-slot-${SLOT_1.starts_at}`));

  // Confirm section with submit button
  await waitFor(() => expect(screen.getByTestId('book-submit')).toBeOnTheScreen());

  // Press submit
  await act(async () => {
    fireEvent.press(screen.getByTestId('book-submit'));
  });

  // mutateAsync resolves → success screen replaces the flow, no router.back
  await waitFor(() => {
    expect(mockMutateAsync).toHaveBeenCalledWith({
      expertId: 'e1',
      sessionTypeId: 'st1',
      scheduledAt: SLOT_1.starts_at,
      notes: undefined,
    });
    expect(screen.getByTestId('book-success')).toBeOnTheScreen();
  });
  expect(mockBack).not.toHaveBeenCalled();

  // "View My Sessions" navigates to the sessions list
  fireEvent.press(screen.getByTestId('book-view-sessions'));
  expect(mockReplace).toHaveBeenCalledWith('/coaching');
});


test('full flow with notes: notes value passed to mutateAsync', async () => {
  mockUseGroupsQuery.mockReturnValue(dataHook([GROUP_A]));
  mockUseCoachingExpertsQuery.mockReturnValue(dataHook([EXPERT_1]));
  mockUseSessionTypesQuery.mockReturnValue(dataHook([SESSION_TYPE_1]));
  mockUseSlotsQuery.mockReturnValue(dataHook([SLOT_1]));
  mockMutateAsync.mockResolvedValueOnce({ id: 'booking-2' });

  await render(<Providers client={client}><BookScreen /></Providers>);

  await waitFor(() => expect(screen.getByTestId('book-expert-e1')).toBeOnTheScreen());
  fireEvent.press(screen.getByTestId('book-expert-e1'));

  await waitFor(() => expect(screen.getByTestId('book-type-st1')).toBeOnTheScreen());
  fireEvent.press(screen.getByTestId('book-type-st1'));

  await waitFor(() =>
    expect(screen.getByTestId(`book-slot-${SLOT_1.starts_at}`)).toBeOnTheScreen(),
  );
  fireEvent.press(screen.getByTestId(`book-slot-${SLOT_1.starts_at}`));

  await waitFor(() => expect(screen.getByTestId('book-notes')).toBeOnTheScreen());

  // Type notes – wrap in act so React flushes the setNotes state update before
  // the next waitFor disables the act environment, preventing overlap warnings.
  await act(async () => {
    fireEvent.changeText(screen.getByTestId('book-notes'), 'My prep notes');
  });

  await act(async () => {
    fireEvent.press(screen.getByTestId('book-submit'));
  });

  // mutateAsync resolves with the typed notes → success screen, no router.back
  await waitFor(() => {
    expect(mockMutateAsync).toHaveBeenCalledWith({
      expertId: 'e1',
      sessionTypeId: 'st1',
      scheduledAt: SLOT_1.starts_at,
      notes: 'My prep notes',
    });
    expect(screen.getByTestId('book-success')).toBeOnTheScreen();
  });
  expect(mockBack).not.toHaveBeenCalled();
});


// ── Test: notes reset when expert changes ─────────────────────────────────────

test('notes reset when expert changes: submitted body has notes: undefined', async () => {
  mockUseGroupsQuery.mockReturnValue(dataHook([GROUP_A]));
  mockUseCoachingExpertsQuery.mockReturnValue(dataHook([EXPERT_1, EXPERT_2]));
  mockUseSessionTypesQuery.mockReturnValue(dataHook([SESSION_TYPE_1, SESSION_TYPE_2]));
  mockUseSlotsQuery.mockReturnValue(dataHook([SLOT_1]));
  mockMutateAsync.mockResolvedValue({ id: 'booking-x' });

  await render(<Providers client={client}><BookScreen /></Providers>);

  // Step 1: select expert 1, session type, slot → confirm section appears
  await waitFor(() => expect(screen.getByTestId('book-expert-e1')).toBeOnTheScreen());
  fireEvent.press(screen.getByTestId('book-expert-e1'));
  await waitFor(() => expect(screen.getByTestId('book-type-st1')).toBeOnTheScreen());
  fireEvent.press(screen.getByTestId('book-type-st1'));
  await waitFor(() =>
    expect(screen.getByTestId(`book-slot-${SLOT_1.starts_at}`)).toBeOnTheScreen(),
  );
  fireEvent.press(screen.getByTestId(`book-slot-${SLOT_1.starts_at}`));
  await waitFor(() => expect(screen.getByTestId('book-notes')).toBeOnTheScreen());

  // Step 2: type notes
  await act(async () => {
    fireEvent.changeText(screen.getByTestId('book-notes'), 'Some notes');
  });

  // Step 3: change expert → notes reset, confirm section gone
  fireEvent.press(screen.getByTestId('book-expert-e2'));
  await waitFor(() => expect(screen.queryByTestId('book-submit')).toBeNull());

  // Step 4: re-complete the flow with expert 2's session type
  await waitFor(() => expect(screen.getByTestId('book-type-st2')).toBeOnTheScreen());
  fireEvent.press(screen.getByTestId('book-type-st2'));
  await waitFor(() =>
    expect(screen.getByTestId(`book-slot-${SLOT_1.starts_at}`)).toBeOnTheScreen(),
  );
  fireEvent.press(screen.getByTestId(`book-slot-${SLOT_1.starts_at}`));
  await waitFor(() => expect(screen.getByTestId('book-submit')).toBeOnTheScreen());

  // Step 5: submit — notes field was reset so submitted body has notes: undefined
  await act(async () => {
    fireEvent.press(screen.getByTestId('book-submit'));
  });
  await waitFor(() => {
    expect(mockMutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({ notes: undefined }),
    );
  });
});

// ── Test 4: changing expert resets session-type / slot selections ──────────────

test('changing expert resets session type and slot selections', async () => {
  mockUseGroupsQuery.mockReturnValue(dataHook([GROUP_A]));
  mockUseCoachingExpertsQuery.mockReturnValue(dataHook([EXPERT_1, EXPERT_2]));
  // Session types for both experts returned
  mockUseSessionTypesQuery.mockReturnValue(dataHook([SESSION_TYPE_1, SESSION_TYPE_2]));
  mockUseSlotsQuery.mockReturnValue(dataHook([SLOT_1]));

  await render(<Providers client={client}><BookScreen /></Providers>);

  expect(screen.getByTestId('book-expert-e1')).toBeOnTheScreen();

  // Select expert 1 → see session types → select type → see slot
  fireEvent.press(screen.getByTestId('book-expert-e1'));
  await waitFor(() => expect(screen.getByTestId('book-type-st1')).toBeOnTheScreen());
  fireEvent.press(screen.getByTestId('book-type-st1'));
  await waitFor(() =>
    expect(screen.getByTestId(`book-slot-${SLOT_1.starts_at}`)).toBeOnTheScreen(),
  );
  fireEvent.press(screen.getByTestId(`book-slot-${SLOT_1.starts_at}`));
  await waitFor(() => expect(screen.getByTestId('book-submit')).toBeOnTheScreen());

  // Now switch to expert 2 — confirm section should disappear (slot reset)
  fireEvent.press(screen.getByTestId('book-expert-e2'));

  await waitFor(() => {
    expect(screen.queryByTestId('book-submit')).toBeNull();
  });

  // Slots query should be gated (no slot selected) — useSlotsQuery with e2 should be called
  // but with empty sessionTypeId (reset), so submit is gone
  expect(screen.queryByTestId(`book-slot-${SLOT_1.starts_at}`)).toBeNull();
});

// ── Test 5: submit error → inline error text, no navigation ───────────────────

test('submit error shows book-error testID, no navigation', async () => {
  mockUseGroupsQuery.mockReturnValue(dataHook([GROUP_A]));
  mockUseCoachingExpertsQuery.mockReturnValue(dataHook([EXPERT_1]));
  mockUseSessionTypesQuery.mockReturnValue(dataHook([SESSION_TYPE_1]));
  mockUseSlotsQuery.mockReturnValue(dataHook([SLOT_1]));
  mockMutateAsync.mockRejectedValueOnce(new Error('Booking failed'));

  await render(<Providers client={client}><BookScreen /></Providers>);

  await waitFor(() => expect(screen.getByTestId('book-expert-e1')).toBeOnTheScreen());
  fireEvent.press(screen.getByTestId('book-expert-e1'));

  await waitFor(() => expect(screen.getByTestId('book-type-st1')).toBeOnTheScreen());
  fireEvent.press(screen.getByTestId('book-type-st1'));

  await waitFor(() =>
    expect(screen.getByTestId(`book-slot-${SLOT_1.starts_at}`)).toBeOnTheScreen(),
  );
  fireEvent.press(screen.getByTestId(`book-slot-${SLOT_1.starts_at}`));

  await waitFor(() => expect(screen.getByTestId('book-submit')).toBeOnTheScreen());

  await act(async () => {
    fireEvent.press(screen.getByTestId('book-submit'));
  });

  await waitFor(() => {
    expect(screen.getByTestId('book-error')).toBeOnTheScreen();
  });
  expect(mockBack).not.toHaveBeenCalled();
});

// ── Test 6: 409 → slotTaken copy, slot selection reset ────────────────────────

test('409 BookingError shows slotTaken message and resets slot selection', async () => {
  mockUseGroupsQuery.mockReturnValue(dataHook([GROUP_A]));
  mockUseCoachingExpertsQuery.mockReturnValue(dataHook([EXPERT_1]));
  mockUseSessionTypesQuery.mockReturnValue(dataHook([SESSION_TYPE_1]));
  mockUseSlotsQuery.mockReturnValue(dataHook([SLOT_1]));
  mockMutateAsync.mockRejectedValueOnce(new BookingError(409));

  await render(<Providers client={client}><BookScreen /></Providers>);

  await waitFor(() => expect(screen.getByTestId('book-expert-e1')).toBeOnTheScreen());
  fireEvent.press(screen.getByTestId('book-expert-e1'));

  await waitFor(() => expect(screen.getByTestId('book-type-st1')).toBeOnTheScreen());
  fireEvent.press(screen.getByTestId('book-type-st1'));

  await waitFor(() =>
    expect(screen.getByTestId(`book-slot-${SLOT_1.starts_at}`)).toBeOnTheScreen(),
  );
  fireEvent.press(screen.getByTestId(`book-slot-${SLOT_1.starts_at}`));

  await waitFor(() => expect(screen.getByTestId('book-submit')).toBeOnTheScreen());

  await act(async () => {
    fireEvent.press(screen.getByTestId('book-submit'));
  });

  await waitFor(() => {
    expect(screen.getByTestId('book-error')).toBeOnTheScreen();
  });
  expect(screen.getByTestId('book-error')).toHaveTextContent(
    'That slot was just taken. Please choose another.',
  );
  // Slot reset → confirm section (submit button) gone
  await waitFor(() => {
    expect(screen.queryByTestId('book-submit')).toBeNull();
  });
  expect(mockBack).not.toHaveBeenCalled();
});

// ── Test 7: 400 → tooLate copy ────────────────────────────────────────────────

test('400 BookingError shows tooLate message', async () => {
  mockUseGroupsQuery.mockReturnValue(dataHook([GROUP_A]));
  mockUseCoachingExpertsQuery.mockReturnValue(dataHook([EXPERT_1]));
  mockUseSessionTypesQuery.mockReturnValue(dataHook([SESSION_TYPE_1]));
  mockUseSlotsQuery.mockReturnValue(dataHook([SLOT_1]));
  mockMutateAsync.mockRejectedValueOnce(new BookingError(400));

  await render(<Providers client={client}><BookScreen /></Providers>);

  await waitFor(() => expect(screen.getByTestId('book-expert-e1')).toBeOnTheScreen());
  fireEvent.press(screen.getByTestId('book-expert-e1'));

  await waitFor(() => expect(screen.getByTestId('book-type-st1')).toBeOnTheScreen());
  fireEvent.press(screen.getByTestId('book-type-st1'));

  await waitFor(() =>
    expect(screen.getByTestId(`book-slot-${SLOT_1.starts_at}`)).toBeOnTheScreen(),
  );
  fireEvent.press(screen.getByTestId(`book-slot-${SLOT_1.starts_at}`));

  await waitFor(() => expect(screen.getByTestId('book-submit')).toBeOnTheScreen());

  await act(async () => {
    fireEvent.press(screen.getByTestId('book-submit'));
  });

  await waitFor(() => {
    expect(screen.getByTestId('book-error')).toBeOnTheScreen();
  });
  expect(screen.getByTestId('book-error')).toHaveTextContent(
    'This time can no longer be booked. Please pick a later slot.',
  );
  // Slot selection not reset on 400 — submit button stays visible
  expect(screen.getByTestId('book-submit')).toBeOnTheScreen();
  expect(mockBack).not.toHaveBeenCalled();
});
