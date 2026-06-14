import { render } from '@testing-library/react-native';

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => undefined),
  deleteItemAsync: jest.fn(async () => undefined),
}));

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

jest.mock('../api/queries/coaching', () => {
  const emptyList = () => ({ data: [], isPending: false, isError: false, refetch: jest.fn() });
  return {
    useSessionTypesQuery: emptyList,
    useMyAvailabilityQuery: emptyList,
    useBlockedSlotsQuery: emptyList,
    useCreateSessionTypeMutation: () => ({ mutateAsync: jest.fn(), isPending: false }),
    useUpdateSessionTypeMutation: () => ({ mutateAsync: jest.fn(), isPending: false }),
    useDeactivateSessionTypeMutation: () => ({ mutateAsync: jest.fn(), isPending: false }),
    useCreateAvailabilityMutation: () => ({ mutateAsync: jest.fn(), isPending: false }),
    useUpdateAvailabilityMutation: () => ({ mutateAsync: jest.fn(), isPending: false }),
    useDeleteAvailabilityMutation: () => ({ mutateAsync: jest.fn(), isPending: false }),
    useCreateBlockedSlotMutation: () => ({ mutateAsync: jest.fn(), isPending: false }),
    useDeleteBlockedSlotMutation: () => ({ mutateAsync: jest.fn(), isPending: false }),
  };
});

import AvailabilityScreen from '../app/availability';

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
