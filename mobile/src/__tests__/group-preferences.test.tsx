import { render, screen, fireEvent, waitFor, cleanup, act } from '@testing-library/react-native';

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => undefined),
  deleteItemAsync: jest.fn(async () => undefined),
}));

const mockRouterReplace = jest.fn();
const mockRouterBack = jest.fn();

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ id: 'g1' }),
  useRouter: () => ({ replace: mockRouterReplace, back: mockRouterBack }),
  Stack: { Screen: () => null },
}));

const mockUseGroupQuery = jest.fn();
const mockUseUpdateGroupMutation = jest.fn();
const mockUseDeleteGroupMutation = jest.fn();
const mockUseLeaveGroupMutation = jest.fn();

jest.mock('../api/queries/groups', () => ({
  useGroupQuery: (...args: unknown[]) => mockUseGroupQuery(...args),
  useUpdateGroupMutation: (...args: unknown[]) => mockUseUpdateGroupMutation(...args),
  useDeleteGroupMutation: (...args: unknown[]) => mockUseDeleteGroupMutation(...args),
  useLeaveGroupMutation: (...args: unknown[]) => mockUseLeaveGroupMutation(...args),
}));

let mockPermissions = ['groups:preferences:edit', 'groups:delete'];

jest.mock('../auth/auth-store', () => ({
  useAuth: (sel: (s: unknown) => unknown) =>
    sel({
      user: {
        id: 'u1',
        permissions: mockPermissions,
      },
    }),
  api: {},
}));

jest.mock('../components/ui/z-toast', () => ({
  showToast: jest.fn(),
}));

import { initI18n } from '../i18n';
import GroupPreferencesScreen from '../app/group/[id]/preferences';
import { showToast } from '../components/ui/z-toast';

beforeAll(() => initI18n('en'));

afterEach(() => cleanup());

beforeEach(() => {
  mockRouterReplace.mockClear();
  mockRouterBack.mockClear();
  (showToast as jest.Mock).mockReset?.();
  mockPermissions = ['groups:preferences:edit', 'groups:delete'];
  mockUseGroupQuery.mockReturnValue({
    data: { id: 'g1', name: 'Karate Club', owner_id: 'u1', avatar: null, description: 'Dojo', created_at: '', updated_at: '' },
    isPending: false,
    isError: false,
    refetch: jest.fn(),
  });
  mockUseUpdateGroupMutation.mockReturnValue({ mutateAsync: jest.fn(async () => ({})), isPending: false });
  mockUseDeleteGroupMutation.mockReturnValue({ mutateAsync: jest.fn(async () => undefined), isPending: false });
  mockUseLeaveGroupMutation.mockReturnValue({ mutateAsync: jest.fn(async () => undefined), isPending: false });
});

test('saves edited preferences via updateGroup', async () => {
  const updateMutate = jest.fn(async () => ({}));
  mockUseUpdateGroupMutation.mockReturnValue({ mutateAsync: updateMutate, isPending: false });
  const { getByTestId } = await render(<GroupPreferencesScreen />);
  // Since data is provided synchronously by the mock, name is initialized from data
  expect(getByTestId('group-name-input').props.value).toBe('Karate Club');
  // Dirty the form: change name
  fireEvent.changeText(getByTestId('group-name-input'), 'Karate Club 2');
  // Wait for the button to become enabled (re-render after state update)
  await waitFor(() => expect(getByTestId('group-save')).not.toBeDisabled());
  fireEvent.press(getByTestId('group-save'));
  await waitFor(() => expect(updateMutate).toHaveBeenCalledTimes(1));
  expect(updateMutate).toHaveBeenCalledWith(
    expect.objectContaining({ name: 'Karate Club 2' }),
  );
});

test('owner with groups:delete sees the delete button and confirms deletion', async () => {
  const deleteMutate = jest.fn(async () => undefined);
  mockUseDeleteGroupMutation.mockReturnValue({ mutateAsync: deleteMutate, isPending: false });
  const { getByTestId, getAllByText } = await render(<GroupPreferencesScreen />);
  // ZDangerZoneCard action button testID is `{testID}-action`
  expect(getByTestId('group-delete-action')).toBeTruthy();
  fireEvent.press(getByTestId('group-delete-action'));
  // After pressing the action button, wait for the ZConfirmDialog (Modal) to
  // appear. The dialog is lazy-mounted so we must flush the state update first.
  // Once open, the tree contains 3 elements with text 'Delete Group':
  //   [0] action button, [1] dialog title, [2] dialog confirm button.
  // We press the last one (the confirm button).
  await waitFor(() => expect(getAllByText('Delete Group').length).toBeGreaterThan(1));
  const deleteTexts = getAllByText('Delete Group');
  fireEvent.press(deleteTexts[deleteTexts.length - 1]);
  await waitFor(() => expect(deleteMutate).toHaveBeenCalledTimes(1));
  expect(mockRouterReplace).toHaveBeenCalledWith('/(tabs)/groups');
});

test('save is disabled until the form is dirty', async () => {
  const updateMutate = jest.fn(async () => ({}));
  mockUseUpdateGroupMutation.mockReturnValue({ mutateAsync: updateMutate, isPending: false });
  const { getByTestId } = await render(<GroupPreferencesScreen />);
  // Name is initialized from data, so hasChanges=false and button is disabled
  expect(getByTestId('group-name-input').props.value).toBe('Karate Club');
  expect(getByTestId('group-save')).toBeDisabled();
  // Make it dirty and save
  fireEvent.changeText(getByTestId('group-name-input'), 'Karate Club 2');
  await waitFor(() => expect(getByTestId('group-save')).not.toBeDisabled());
  fireEvent.press(getByTestId('group-save'));
  await waitFor(() => expect(updateMutate).toHaveBeenCalledTimes(1));
});

// Cold-cache path: the component mounts while isPending=true (data undefined),
// then data resolves. The lazy-init bug causes the form to stay empty and the
// save button to be permanently disabled. The fix (useEffect hydration) must
// populate the name field with the real server value after data arrives.
test('cold-cache: form hydrates with real server values after pending resolves', async () => {
  // Start in pending state — simulates cold cache / deep-link / gcTime eviction
  mockUseGroupQuery.mockReturnValue({
    data: undefined,
    isPending: true,
    isError: false,
    refetch: jest.fn(),
  });

  const { getByTestId, queryByTestId, rerender } = await render(<GroupPreferencesScreen />);

  // While pending, the skeleton is shown — no form fields
  expect(getByTestId('group-preferences-skeleton')).toBeTruthy();
  expect(queryByTestId('group-name-input')).toBeNull();

  // Data arrives — transition to loaded state
  await act(async () => {
    mockUseGroupQuery.mockReturnValue({
      data: { id: 'g1', name: 'Karate Club', owner_id: 'u1', avatar: null, description: 'Dojo', created_at: '', updated_at: '' },
      isPending: false,
      isError: false,
      refetch: jest.fn(),
    });
    await rerender(<GroupPreferencesScreen />);
  });

  // The form must show the real server name (not empty string from lazy init)
  await waitFor(() => expect(queryByTestId('group-name-input')).not.toBeNull());
  expect(getByTestId('group-name-input').props.value).toBe('Karate Club');
  // Save button must be disabled (form is not dirty — server value matches field value)
  expect(getByTestId('group-save')).toBeDisabled();
});

// ── fix (1): back affordance ───────────────────────────────────────────────────
// Native header now provides the back button (no longer in-body). The test
// verifies the screen renders its content correctly without an in-body back row.

test('renders preferences content without an in-body back button', async () => {
  await render(<GroupPreferencesScreen />);
  // The save button (testID="group-save") is the primary interactive element
  // and confirms the form renders correctly.
  expect(screen.getByTestId('group-save')).toBeOnTheScreen();
  // No in-body back button — back is provided by the native stack header.
  expect(screen.queryByRole('button', { name: /^back$/i })).toBeNull();
});

// ── fix (2): leave-only branch ────────────────────────────────────────────────

test('leave-only member (canLeave && !canDelete) sees leave button, not dead-end', async () => {
  // Non-owner: can leave but cannot delete
  mockPermissions = ['groups:membership:leave'];
  // Group owner_id !== user id, so canLeave is gated by owner check in preferences too
  mockUseGroupQuery.mockReturnValue({
    data: { id: 'g1', name: 'Karate Club', owner_id: 'u2', avatar: null, description: '', created_at: '', updated_at: '' },
    isPending: false,
    isError: false,
    refetch: jest.fn(),
  });

  await render(<GroupPreferencesScreen />);

  // Leave button must be present
  expect(screen.getByTestId('preferences-leave-btn')).toBeOnTheScreen();
  // The "deleteUnavailable" dead-end text must NOT appear
  expect(screen.queryByText('Only the group owner can delete this group.')).toBeNull();
});

test('leave-only member: confirming leave calls mutation and navigates back', async () => {
  mockPermissions = ['groups:membership:leave'];
  const leaveMutate = jest.fn(async () => undefined);
  mockUseLeaveGroupMutation.mockReturnValue({ mutateAsync: leaveMutate, isPending: false });
  mockUseGroupQuery.mockReturnValue({
    data: { id: 'g1', name: 'Karate Club', owner_id: 'u2', avatar: null, description: '', created_at: '', updated_at: '' },
    isPending: false,
    isError: false,
    refetch: jest.fn(),
  });

  await render(<GroupPreferencesScreen />);

  // Open confirm dialog
  fireEvent.press(screen.getByTestId('preferences-leave-btn'));
  await waitFor(() => expect(screen.getByTestId('preferences-leave-dialog')).toBeOnTheScreen());

  // Confirm
  const confirmBtns = screen.getAllByText('Leave group');
  fireEvent.press(confirmBtns[confirmBtns.length - 1]);

  await waitFor(() => expect(leaveMutate).toHaveBeenCalledTimes(1));
  expect(mockRouterBack).toHaveBeenCalled();
});
