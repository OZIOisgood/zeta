import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react-native';
import type { ReactNode } from 'react';

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => undefined),
  deleteItemAsync: jest.fn(async () => undefined),
}));

jest.mock('expo-localization', () => ({ getLocales: () => [{ languageCode: 'en' }] }));

// expo-image-picker: stub in case any module in the render tree imports it.
jest.mock('expo-image-picker', () => ({
  launchImageLibraryAsync: jest.fn(async () => ({ canceled: true, assets: [] })),
}));

// ZAvatarInput is mapped to src/__mocks__/z-avatar-input.tsx via moduleNameMapper
// in package.json — no inline jest.mock() factory needed here.

const mockMutateAsync = jest.fn();
const mockUseCreateGroupMutation = jest.fn();

jest.mock('../api/queries/groups', () => ({
  ...jest.requireActual('../api/queries/groups'),
  useCreateGroupMutation: () => mockUseCreateGroupMutation(),
}));

const mockReplace = jest.fn();
const mockBack = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace, back: mockBack }),
  Stack: { Screen: () => null },
}));

jest.mock('../components/ui/z-toast', () => ({
  showToast: jest.fn(),
}));

import { initI18n } from '../i18n';
import CreateGroupScreen from '../app/group/create';
import { showToast } from '../components/ui/z-toast';

beforeAll(() => initI18n('en'));

function setup(isPending = false) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  mockUseCreateGroupMutation.mockReturnValue({ mutateAsync: mockMutateAsync, isPending });
  function Providers({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  }
  return { client, Providers };
}

beforeEach(() => {
  mockMutateAsync.mockReset();
  mockReplace.mockReset();
  mockBack.mockReset();
  (showToast as jest.Mock).mockReset();
});

// ── rendering ─────────────────────────────────────────────────────────────────

test('renders the create group form header', async () => {
  const { Providers } = setup();
  await render(<Providers><CreateGroupScreen /></Providers>);
  expect(screen.getByText('Create a new group')).toBeOnTheScreen();
});

test('renders name input, avatar input, description textarea', async () => {
  const { Providers } = setup();
  await render(<Providers><CreateGroupScreen /></Providers>);
  expect(screen.getByTestId('create-group-name')).toBeOnTheScreen();
  expect(screen.getByTestId('create-group-avatar')).toBeOnTheScreen();
  expect(screen.getByTestId('create-group-description')).toBeOnTheScreen();
});

// ── validation ────────────────────────────────────────────────────────────────

test('submit without name shows name-required error, does not call mutate', async () => {
  const { Providers } = setup();
  await render(<Providers><CreateGroupScreen /></Providers>);
  // Wrap all events in a single act to properly flush async state updates (React 19)
  await act(async () => { fireEvent.press(screen.getByTestId('create-group-submit')); });
  expect(screen.getByText('Group name is required')).toBeOnTheScreen();
  expect(mockMutateAsync).not.toHaveBeenCalled();
});

test('submit without avatar shows avatar-required error, does not call mutate', async () => {
  const { Providers } = setup();
  await render(<Providers><CreateGroupScreen /></Providers>);
  // All events in one act so state updates from changeText + press are fully flushed
  await act(async () => {
    fireEvent.changeText(screen.getByTestId('create-group-name'), 'My Group');
    fireEvent.press(screen.getByTestId('create-group-submit'));
  });
  expect(screen.getByText('Group avatar is required.')).toBeOnTheScreen();
  expect(mockMutateAsync).not.toHaveBeenCalled();
});

// ── success path ──────────────────────────────────────────────────────────────

test('submit with valid name + avatar calls mutateAsync and navigates to group', async () => {
  const GROUP = { id: 'g1', name: 'My Group', owner_id: 'u1', avatar: null, description: '', created_at: '', updated_at: '' };
  mockMutateAsync.mockResolvedValueOnce(GROUP);
  const { Providers } = setup();

  await render(<Providers><CreateGroupScreen /></Providers>);

  // Step 1: fill in name and pick avatar (state updates must flush before submit)
  await act(async () => {
    fireEvent.changeText(screen.getByTestId('create-group-name'), 'My Group');
    fireEvent.press(screen.getByTestId('create-group-avatar'));
  });

  // Step 2: submit (runs handleSubmit with committed name+avatar state)
  await act(async () => {
    fireEvent.press(screen.getByTestId('create-group-submit'));
  });

  await waitFor(() => expect(mockMutateAsync).toHaveBeenCalledWith({
    name: 'My Group',
    avatar: 'base64data',
    description: undefined,
  }));
  await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/group/g1'));
  // Success toast must use a proper title (not the button label) and a body message
  expect(showToast).toHaveBeenCalledWith('Success', 'Group created successfully', 'success');
});

// ── error path ────────────────────────────────────────────────────────────────

test('mutateAsync failure shows inline error banner', async () => {
  mockMutateAsync.mockRejectedValueOnce(new Error('network'));
  const { Providers } = setup();

  await render(<Providers><CreateGroupScreen /></Providers>);

  await act(async () => {
    fireEvent.changeText(screen.getByTestId('create-group-name'), 'My Group');
    fireEvent.press(screen.getByTestId('create-group-avatar'));
  });

  await act(async () => {
    fireEvent.press(screen.getByTestId('create-group-submit'));
  });

  await waitFor(() =>
    expect(screen.getByTestId('create-group-error')).toBeOnTheScreen(),
  );
  // Error banner must say "Failed to create group" (not the update verb)
  expect(screen.getByText('Failed to create group')).toBeOnTheScreen();
  expect(mockReplace).not.toHaveBeenCalled();
});

// ── loading state ─────────────────────────────────────────────────────────────

test('submit button is disabled while isPending', async () => {
  const { Providers } = setup(true /* isPending */);
  await render(<Providers><CreateGroupScreen /></Providers>);
  const submitBtn = screen.getByTestId('create-group-submit');
  expect(submitBtn).toBeDisabled();
});
