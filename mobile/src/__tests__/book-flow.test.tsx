import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
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

const mockBack = jest.fn();
const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: mockBack, replace: mockReplace }),
  Stack: { Screen: () => null },
}));

const mockShowToast = jest.fn();
jest.mock('../components/ui/z-toast', () => ({
  ...jest.requireActual('../components/ui/z-toast'),
  showToast: (...args: unknown[]) => mockShowToast(...args),
}));

import { initI18n } from '../i18n';
import BookScreen from '../app/book';
import type { CoachingExpert, CoachingSlot, SessionType } from '../api/queries/coaching';
import { BookingError } from '../api/queries/coaching';
import type { Group } from '../api/queries/groups';

beforeAll(() => initI18n('en'));

// ── test data ─────────────────────────────────────────────────────────────────
const GROUP_A: Group = { id: 'g1', name: 'Group Alpha' } as Group;
const EXPERT_1: CoachingExpert = { expert_id: 'e1', first_name: 'Alice', last_name: 'Smith' };
const TYPE_1: SessionType = {
  id: 't1',
  expert_id: 'e1',
  group_id: 'g1',
  name: 'Video review',
  description: 'Detailed feedback on an uploaded video.',
  duration_minutes: 30,
  is_active: true,
  created_at: '2026-01-01T00:00:00Z',
} as SessionType;
// Two slots on the same day so the date rail has one pill and the grid has two.
const DAY = '2026-06-18';
const SLOT_A: CoachingSlot = {
  expert_id: 'e1',
  starts_at: `${DAY}T16:00:00Z`,
  ends_at: `${DAY}T16:30:00Z`,
  duration_minutes: 30,
};
const SLOT_B: CoachingSlot = {
  expert_id: 'e1',
  starts_at: `${DAY}T16:45:00Z`,
  ends_at: `${DAY}T17:15:00Z`,
  duration_minutes: 30,
};

function ok<T>(data: T) {
  return { data, isPending: false, isError: false, refetch: jest.fn() } as const;
}
function pending() {
  return { data: undefined, isPending: true, isError: false, refetch: jest.fn() } as const;
}

// RNTL 14 render() is async in this setup — await it so the module-level
// `screen` is connected before any query.
async function renderScreen() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return render(<BookScreen />, { wrapper });
}

beforeEach(() => {
  jest.clearAllMocks();
  // Single group → group step auto-skipped. Defaults: data present for all.
  mockUseGroupsQuery.mockReturnValue(ok<Group[]>([GROUP_A]));
  mockUseCoachingExpertsQuery.mockReturnValue(ok<CoachingExpert[]>([EXPERT_1]));
  mockUseSessionTypesQuery.mockReturnValue(ok<SessionType[]>([TYPE_1]));
  mockUseSlotsQuery.mockReturnValue(ok<CoachingSlot[]>([SLOT_A, SLOT_B]));
  mockMutateAsync.mockResolvedValue({});
  mockUseCreateBookingMutation.mockReturnValue({ mutateAsync: mockMutateAsync, isPending: false });
});
afterEach(cleanup);

// fireEvent presses queue React-19 concurrent state updates; flush them so the
// next step's UI is committed before we query/press it.
async function press(testId: string) {
  await act(async () => {
    fireEvent.press(screen.getByTestId(testId));
  });
}

// Walk Expert → Type → Time → Confirm, returning at the confirm step.
async function advanceToConfirm() {
  await press('book-expert-e1');
  await press('book-bar-cta'); // Expert → Type
  await press('book-type-t1');
  await press('book-bar-cta'); // Type → Time
  await press('book-daterail-0'); // pick the day
  await press(`book-time-${SLOT_A.starts_at}`); // pick a time
  await press('book-bar-cta'); // Time → Confirm
}

test('renders the stepper and the expert step first (single group skips group step)', async () => {
  await renderScreen();
  expect(screen.getByTestId('book-stepper')).toBeTruthy();
  expect(screen.getByTestId('book-expert-e1')).toBeTruthy();
});

test('bar CTA is disabled until the current step is satisfied', async () => {
  await renderScreen();
  expect(screen.getByTestId('book-bar-cta').props.accessibilityState).toMatchObject({ disabled: true });
  await press('book-expert-e1');
  expect(screen.getByTestId('book-bar-cta').props.accessibilityState).toMatchObject({ disabled: false });
});

test('expert step shows skeletons while loading', async () => {
  mockUseCoachingExpertsQuery.mockReturnValue(pending());
  await renderScreen();
  expect(screen.queryByTestId('book-expert-e1')).toBeNull();
});

test('full happy path books the session and shows success', async () => {
  await renderScreen();
  await advanceToConfirm();
  // The confirm-stage CTA is the persistent booking-bar button.
  expect(screen.queryByTestId('book-submit') ?? screen.getByTestId('book-bar-cta')).toBeTruthy();
  await act(async () => {
    fireEvent.press(screen.getByTestId('book-bar-cta')); // Confirm → Book
  });
  await waitFor(() => expect(mockMutateAsync).toHaveBeenCalledWith({
    expertId: 'e1',
    sessionTypeId: 't1',
    scheduledAt: SLOT_A.starts_at,
    notes: undefined,
  }));
  await waitFor(() => expect(screen.getByTestId('book-success')).toBeTruthy());
  expect(mockShowToast).toHaveBeenCalled();
});

test('Fertig on success returns to coaching', async () => {
  await renderScreen();
  await advanceToConfirm();
  await act(async () => { fireEvent.press(screen.getByTestId('book-bar-cta')); });
  await waitFor(() => expect(screen.getByTestId('book-success')).toBeTruthy());
  fireEvent.press(screen.getByTestId('book-view-sessions'));
  expect(mockReplace).toHaveBeenCalledWith('/coaching');
});

test('409 conflict clears the slot and shows the taken error', async () => {
  mockMutateAsync.mockRejectedValueOnce(new BookingError(409));
  await renderScreen();
  await advanceToConfirm();
  await act(async () => { fireEvent.press(screen.getByTestId('book-bar-cta')); });
  await waitFor(() => expect(screen.getByTestId('book-error')).toBeTruthy());
  expect(screen.queryByTestId('book-success')).toBeNull();
});

test('navigable stepper jumps back to the expert step', async () => {
  await renderScreen();
  await press('book-expert-e1');
  await press('book-bar-cta'); // now on Type step
  expect(screen.getByTestId('book-type-t1')).toBeTruthy();
  await act(async () => {
    fireEvent.press(screen.getByLabelText('Select Expert')); // tap stepper step 0
  });
  expect(screen.getByTestId('book-expert-e1')).toBeTruthy();
});

test('multiple groups show the group step first', async () => {
  mockUseGroupsQuery.mockReturnValue(ok<Group[]>([GROUP_A, { id: 'g2', name: 'Group Beta' } as Group]));
  await renderScreen();
  expect(screen.getByTestId('book-group-g1')).toBeTruthy();
  expect(screen.getByTestId('book-group-g2')).toBeTruthy();
});
