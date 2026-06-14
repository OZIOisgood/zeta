import { render, fireEvent, waitFor, cleanup } from '@testing-library/react-native';

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => undefined),
  deleteItemAsync: jest.fn(async () => undefined),
}));

const mockRouterReplace = jest.fn();

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ id: 'g1' }),
  useRouter: () => ({ replace: mockRouterReplace, back: jest.fn() }),
}));

const mockUseGroupQuery = jest.fn();
const mockUseUpdateGroupMutation = jest.fn();
const mockUseDeleteGroupMutation = jest.fn();

jest.mock('../api/queries/groups', () => ({
  useGroupQuery: (...args: unknown[]) => mockUseGroupQuery(...args),
  useUpdateGroupMutation: (...args: unknown[]) => mockUseUpdateGroupMutation(...args),
  useDeleteGroupMutation: (...args: unknown[]) => mockUseDeleteGroupMutation(...args),
}));

jest.mock('../auth/auth-store', () => ({
  useAuth: (sel: (s: unknown) => unknown) =>
    sel({
      user: {
        id: 'u1',
        permissions: ['groups:preferences:edit', 'groups:delete'],
      },
    }),
  api: {},
}));

import { initI18n } from '../i18n';
import GroupPreferencesScreen from '../app/group/[id]/preferences';

beforeAll(() => initI18n('en'));

afterEach(() => cleanup());

beforeEach(() => {
  mockRouterReplace.mockClear();
  mockUseGroupQuery.mockReturnValue({
    data: { id: 'g1', name: 'Karate Club', owner_id: 'u1', avatar: null, description: 'Dojo', created_at: '', updated_at: '' },
    isPending: false,
    isError: false,
    refetch: jest.fn(),
  });
  mockUseUpdateGroupMutation.mockReturnValue({ mutateAsync: jest.fn(async () => ({})), isPending: false });
  mockUseDeleteGroupMutation.mockReturnValue({ mutateAsync: jest.fn(async () => undefined), isPending: false });
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
