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

jest.mock('../api/queries/groups', () => ({
  useGroupsQuery: () => ({ data: [{ id: 'g1', name: 'Dojo' }], isSuccess: true, isPending: false, isError: false }),
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
