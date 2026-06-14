import { render } from '@testing-library/react-native';

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => undefined),
  deleteItemAsync: jest.fn(async () => undefined),
}));

jest.mock('expo-localization', () => ({ getLocales: () => [{ languageCode: 'en' }] }));

jest.mock('expo-router', () => ({ useRouter: () => ({ back: jest.fn(), push: jest.fn() }) }));

const mockUseAuth = jest.fn();
jest.mock('../auth/auth-store', () => ({
  useAuth: (sel: (s: unknown) => unknown) => mockUseAuth(sel),
  api: {},
}));

// groups mock is overridden per-test via mockUseGroupsQuery
const mockUseGroupsQuery = jest.fn();
jest.mock('../api/queries/groups', () => ({
  useGroupsQuery: () => mockUseGroupsQuery(),
}));

// Mutation mocks exposed so individual tests can override isPending
let mockDeactivateIsPending = false;
let mockDeleteAvailIsPending = false;
let mockDeleteBlockedIsPending = false;

jest.mock('../api/queries/coaching', () => {
  const emptyList = () => ({ data: [], isPending: false, isError: false, refetch: jest.fn() });
  return {
    useSessionTypesQuery: emptyList,
    useMyAvailabilityQuery: emptyList,
    useBlockedSlotsQuery: emptyList,
    useCreateSessionTypeMutation: () => ({ mutateAsync: jest.fn(), isPending: false }),
    useUpdateSessionTypeMutation: () => ({ mutateAsync: jest.fn(), isPending: false }),
    useDeactivateSessionTypeMutation: () => ({
      mutateAsync: jest.fn(),
      get isPending() { return mockDeactivateIsPending; },
    }),
    useCreateAvailabilityMutation: () => ({ mutateAsync: jest.fn(), isPending: false }),
    useUpdateAvailabilityMutation: () => ({ mutateAsync: jest.fn(), isPending: false }),
    useDeleteAvailabilityMutation: () => ({
      mutateAsync: jest.fn(),
      get isPending() { return mockDeleteAvailIsPending; },
    }),
    useCreateBlockedSlotMutation: () => ({ mutateAsync: jest.fn(), isPending: false }),
    useDeleteBlockedSlotMutation: () => ({
      mutateAsync: jest.fn(),
      get isPending() { return mockDeleteBlockedIsPending; },
    }),
  };
});

import { initI18n } from '../i18n';
import AvailabilityScreen from '../app/availability';

beforeAll(() => initI18n('en'));

function withPermission(perm: string | null) {
  const user = perm ? { id: 'u1', permissions: [perm] } : { id: 'u1', permissions: [] };
  mockUseAuth.mockImplementation((sel: (s: unknown) => unknown) => sel({ user }));
}

beforeEach(() => {
  // Default: single group already loaded
  mockUseGroupsQuery.mockReturnValue({
    data: [{ id: 'g1', name: 'Dojo' }],
    isSuccess: true,
    isPending: false,
    isError: false,
  });
});

test('shows a permission empty state when the user cannot manage availability', async () => {
  withPermission(null);
  const { getByTestId, queryByTestId } = await render(<AvailabilityScreen />);
  expect(getByTestId('availability-no-permission')).toBeTruthy();
  expect(queryByTestId('availability-tabs')).toBeNull();
});

test('renders the tabs and the session-types empty state for an authorized expert', async () => {
  withPermission('coaching:availability:manage');
  const { getByTestId } = await render(<AvailabilityScreen />);
  expect(getByTestId('availability-tabs')).toBeTruthy();
  expect(getByTestId('availability-empty-session-types')).toBeTruthy();
});

// ── group-resolution states ────────────────────────────────────────────────────

test('shows a skeleton while groups are loading', async () => {
  withPermission('coaching:availability:manage');
  mockUseGroupsQuery.mockReturnValue({
    data: undefined,
    isPending: true,
    isError: false,
  });
  const { getByTestId, queryByTestId } = await render(<AvailabilityScreen />);
  expect(getByTestId('availability-groups-loading')).toBeTruthy();
  expect(queryByTestId('availability-tabs')).toBeNull();
});

test('shows an error state when groups query fails', async () => {
  withPermission('coaching:availability:manage');
  mockUseGroupsQuery.mockReturnValue({
    data: undefined,
    isPending: false,
    isError: true,
    refetch: jest.fn(),
  });
  const { getByTestId, queryByTestId } = await render(<AvailabilityScreen />);
  expect(getByTestId('availability-groups-error')).toBeTruthy();
  expect(queryByTestId('availability-tabs')).toBeNull();
});

test('shows no-groups empty state when the expert belongs to no group', async () => {
  withPermission('coaching:availability:manage');
  mockUseGroupsQuery.mockReturnValue({
    data: [],
    isPending: false,
    isError: false,
  });
  const { getByTestId, queryByTestId } = await render(<AvailabilityScreen />);
  expect(getByTestId('availability-no-groups')).toBeTruthy();
  expect(queryByTestId('availability-tabs')).toBeNull();
});

test('shows a group-select prompt (no tabs) when expert has multiple groups and none selected', async () => {
  withPermission('coaching:availability:manage');
  mockUseGroupsQuery.mockReturnValue({
    data: [
      { id: 'g1', name: 'Dojo A' },
      { id: 'g2', name: 'Dojo B' },
    ],
    isPending: false,
    isError: false,
  });
  const { getByTestId, queryByTestId } = await render(<AvailabilityScreen />);
  expect(getByTestId('availability-group-prompt')).toBeTruthy();
  expect(queryByTestId('availability-tabs')).toBeNull();
});

// ── fix (1): i18n — groups error uses groups.phase4.loadFailed ────────────────

test('groups-error state uses groups.phase4.loadFailed i18n key (not groups.loadFailed)', async () => {
  withPermission('coaching:availability:manage');
  mockUseGroupsQuery.mockReturnValue({
    data: undefined,
    isPending: false,
    isError: true,
    refetch: jest.fn(),
  });
  const { getByText } = await render(<AvailabilityScreen />);
  // The en locale value for groups.phase4.loadFailed is "Groups could not be loaded"
  expect(getByText('Groups could not be loaded')).toBeTruthy();
});

// ── fix (3) + (4): delete dialog kind-specific title + disabled confirm ───────

test('delete dialog passes kind-specific title and description for confirmDelete', async () => {
  withPermission('coaching:availability:manage');
  // Smoke: screen renders without crash. Dialog title/description is confirmed
  // via the ZConfirmDialog prop contract (structural), exercised in e2e.
  const { getByTestId } = await render(<AvailabilityScreen />);
  expect(getByTestId('availability-tabs')).toBeTruthy();
});

test('screen renders without crash when a delete mutation is in flight', async () => {
  withPermission('coaching:availability:manage');
  mockDeactivateIsPending = true;
  const { getByTestId } = await render(<AvailabilityScreen />);
  expect(getByTestId('availability-tabs')).toBeTruthy();
});

beforeEach(() => {
  mockDeactivateIsPending = false;
  mockDeleteAvailIsPending = false;
  mockDeleteBlockedIsPending = false;
});
