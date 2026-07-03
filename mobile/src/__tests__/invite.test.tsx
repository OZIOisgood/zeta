import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

// Must mock before imports that touch native modules
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => undefined),
  deleteItemAsync: jest.fn(async () => undefined),
}));

jest.mock('expo-localization', () => ({ getLocales: () => [{ languageCode: 'en' }] }));

// Mock expo-camera
jest.mock('expo-camera', () => ({
  CameraView: () => null,
  useCameraPermissions: () => [{ granted: true }, jest.fn()],
}));

// Mock expo-router
const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockBack = jest.fn();
const mockUseLocalSearchParams = jest.fn(() => ({}));
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace, back: mockBack }),
  useLocalSearchParams: () => mockUseLocalSearchParams(),
  Stack: { Screen: () => null },
}));

// Invitation hook mocks
const mockUseInvitationInfoQuery = jest.fn();
const mockAcceptMutateAsync = jest.fn();
const mockDeclineMutateAsync = jest.fn();
const mockUseAcceptInvitationMutation = jest.fn();
const mockUseDeclineInvitationMutation = jest.fn();

jest.mock('../api/queries/invitations', () => ({
  useInvitationInfoQuery: (code: string) => mockUseInvitationInfoQuery(code),
  useAcceptInvitationMutation: () => mockUseAcceptInvitationMutation(),
  useDeclineInvitationMutation: () => mockUseDeclineInvitationMutation(),
}));

// Toast spy: assert success/decline/error notifications fire
const mockShowToast = jest.fn();
jest.mock('../components/ui/z-toast', () => ({
  showToast: (...args: unknown[]) => mockShowToast(...args),
}));

import { initI18n } from '../i18n';
import InviteScreen from '../app/invite';

beforeAll(() => initI18n('en'));

let client: QueryClient;
beforeEach(() => {
  jest.clearAllMocks();
  mockUseLocalSearchParams.mockReturnValue({});
  client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });

  mockUseAcceptInvitationMutation.mockReturnValue({
    mutateAsync: mockAcceptMutateAsync,
    isPending: false,
    isError: false,
    error: null,
  });

  mockUseDeclineInvitationMutation.mockReturnValue({
    mutateAsync: mockDeclineMutateAsync,
    isPending: false,
    isError: false,
    error: null,
  });
});

afterEach(() => client.clear());

function Providers({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

const INVITATION_INFO = {
  code: 'ABC123',
  group_id: 'g1',
  group_name: 'Karate Club',
  group_avatar: '',
  already_member: false,
};

// ── Test 1: Manual code entry shows invitation card ───────────────────────────

test('manual code entry: type code and submit → invitation info card appears', async () => {
  mockUseInvitationInfoQuery.mockImplementation((code: string) => {
    if (code === 'ABC123') {
      return { isPending: false, isError: false, data: INVITATION_INFO };
    }
    return { isPending: false, isError: false, data: undefined };
  });

  const { getByTestId, getByText } = await render(<Providers><InviteScreen /></Providers>);

  fireEvent.changeText(getByTestId('invite-code-input'), 'ABC123');
  // Wait for state to flush so the submit button is enabled
  await waitFor(() =>
    expect(getByTestId('invite-code-input').props.value).toBe('ABC123'),
  );
  fireEvent.press(getByTestId('invite-code-submit'));

  await waitFor(() => {
    expect(getByText('Karate Club')).toBeOnTheScreen();
  });

  // Invitation headline tells the user they are being invited
  expect(getByText("You've been invited to join Karate Club")).toBeOnTheScreen();
});

// ── Test 2: Accept flow ───────────────────────────────────────────────────────

test('accept: press accept button → mutateAsync called with code, router.replace to group', async () => {
  mockUseInvitationInfoQuery.mockImplementation((code: string) => {
    if (code === 'ABC123') {
      return { isPending: false, isError: false, data: INVITATION_INFO };
    }
    return { isPending: false, isError: false, data: undefined };
  });

  mockAcceptMutateAsync.mockResolvedValueOnce({ group_id: 'g1' });

  const { getByTestId } = await render(<Providers><InviteScreen /></Providers>);

  // Enter code to get to confirm phase
  fireEvent.changeText(getByTestId('invite-code-input'), 'ABC123');
  await waitFor(() =>
    expect(getByTestId('invite-code-input').props.value).toBe('ABC123'),
  );
  fireEvent.press(getByTestId('invite-code-submit'));

  await waitFor(() => expect(getByTestId('invite-accept')).toBeOnTheScreen());

  fireEvent.press(getByTestId('invite-accept'));

  await waitFor(() => {
    expect(mockAcceptMutateAsync).toHaveBeenCalledWith({ code: 'ABC123' });
    expect(mockReplace).toHaveBeenCalledWith('/group/g1');
  });

  // Success toast fired with the joined message + success tone
  expect(mockShowToast).toHaveBeenCalledWith(
    'Group invitation',
    'You joined Karate Club.',
    'success',
  );
});

// ── Test 2b: decline flow ─────────────────────────────────────────────────────

test('decline: press decline button → mutateAsync called with code, no toast, router.back', async () => {
  mockUseInvitationInfoQuery.mockImplementation((code: string) => {
    if (code === 'ABC123') {
      return { isPending: false, isError: false, data: INVITATION_INFO };
    }
    return { isPending: false, isError: false, data: undefined };
  });

  mockDeclineMutateAsync.mockResolvedValueOnce(undefined);

  const { getByTestId } = await render(<Providers><InviteScreen /></Providers>);

  fireEvent.changeText(getByTestId('invite-code-input'), 'ABC123');
  await waitFor(() =>
    expect(getByTestId('invite-code-input').props.value).toBe('ABC123'),
  );
  fireEvent.press(getByTestId('invite-code-submit'));

  await waitFor(() => expect(getByTestId('invite-decline')).toBeOnTheScreen());

  fireEvent.press(getByTestId('invite-decline'));

  await waitFor(() => {
    expect(mockDeclineMutateAsync).toHaveBeenCalledWith({ code: 'ABC123' });
    expect(mockBack).toHaveBeenCalled();
  });

  // Web shows no toast on decline success — none should fire here either
  expect(mockShowToast).not.toHaveBeenCalled();
});

// ── Test 2c: accept failure → error toast ─────────────────────────────────────

test('accept failure: mutation rejects → error toast fires, no navigation', async () => {
  mockUseInvitationInfoQuery.mockImplementation((code: string) => {
    if (code === 'ABC123') {
      return { isPending: false, isError: false, data: INVITATION_INFO };
    }
    return { isPending: false, isError: false, data: undefined };
  });

  mockAcceptMutateAsync.mockRejectedValueOnce(new Error('boom'));

  const { getByTestId } = await render(<Providers><InviteScreen /></Providers>);

  fireEvent.changeText(getByTestId('invite-code-input'), 'ABC123');
  await waitFor(() =>
    expect(getByTestId('invite-code-input').props.value).toBe('ABC123'),
  );
  fireEvent.press(getByTestId('invite-code-submit'));

  await waitFor(() => expect(getByTestId('invite-accept')).toBeOnTheScreen());

  fireEvent.press(getByTestId('invite-accept'));

  await waitFor(() => {
    expect(mockShowToast).toHaveBeenCalledWith(
      'Group invitation',
      'Failed to join the group. Please try again.',
      'error',
    );
  });
  expect(mockReplace).not.toHaveBeenCalled();
});

// ── Test 3: already_member flow ───────────────────────────────────────────────

test('already_member: open-group button shown, accept button absent', async () => {
  const alreadyMemberInfo = { ...INVITATION_INFO, already_member: true };

  mockUseInvitationInfoQuery.mockImplementation((code: string) => {
    if (code === 'ABC123') {
      return { isPending: false, isError: false, data: alreadyMemberInfo };
    }
    return { isPending: false, isError: false, data: undefined };
  });

  const { getByTestId, queryByTestId } = await render(<Providers><InviteScreen /></Providers>);

  fireEvent.changeText(getByTestId('invite-code-input'), 'ABC123');
  await waitFor(() =>
    expect(getByTestId('invite-code-input').props.value).toBe('ABC123'),
  );
  fireEvent.press(getByTestId('invite-code-submit'));

  await waitFor(() => expect(getByTestId('invite-open-group')).toBeOnTheScreen());

  expect(queryByTestId('invite-accept')).toBeNull();

  fireEvent.press(getByTestId('invite-open-group'));
  expect(mockReplace).toHaveBeenCalledWith('/group/g1');
});

// ── Test 4: invalid manual code → inline hint shown, query not fired ─────────

test('invalid code "hello-world": shows validation hint and never queries with a non-empty code', async () => {
  mockUseInvitationInfoQuery.mockImplementation((code: string) => {
    return { isPending: false, isError: false, data: undefined, _receivedCode: code };
  });

  const { getByTestId, getByText } = await render(<Providers><InviteScreen /></Providers>);

  fireEvent.changeText(getByTestId('invite-code-input'), 'hello-world');
  await waitFor(() =>
    expect(getByTestId('invite-code-input').props.value).toBe('hello-world'),
  );
  fireEvent.press(getByTestId('invite-code-submit'));

  // Validation hint visible
  await waitFor(() => {
    expect(getByText('Enter the 6-character code from the invitation.')).toBeOnTheScreen();
  });

  // Query hook was never called with a non-empty code
  const nonEmptyCalls = mockUseInvitationInfoQuery.mock.calls.filter(
    ([code]: [string]) => code !== '',
  );
  expect(nonEmptyCalls).toHaveLength(0);
});

// ── Test N-3a: deep-link code param seeds the confirm phase ──────────────────

test('prefills the confirm phase from a code deep-link param', async () => {
  mockUseLocalSearchParams.mockReturnValue({ code: 'aB3xZ9' });

  mockUseInvitationInfoQuery.mockImplementation((code: string) => {
    if (code === 'aB3xZ9') {
      return { isPending: true, isError: false, data: undefined };
    }
    return { isPending: false, isError: false, data: undefined };
  });

  const { queryByTestId } = await render(<Providers><InviteScreen /></Providers>);

  // The capture-phase input should NOT be visible — we jumped straight to confirm
  expect(queryByTestId('invite-code-input')).toBeNull();
});

// ── Test 5: unknown code → error shown + reset ────────────────────────────────

test('unknown code: error shown with invite-reset button; press reset → code input visible again', async () => {
  mockUseInvitationInfoQuery.mockImplementation((code: string) => {
    if (code === 'BAD000') {
      return { isPending: false, isError: true, error: new Error('not found'), data: undefined };
    }
    return { isPending: false, isError: false, data: undefined };
  });

  const { getByTestId, getByText, queryByTestId } = await render(<Providers><InviteScreen /></Providers>);

  fireEvent.changeText(getByTestId('invite-code-input'), 'BAD000');
  await waitFor(() =>
    expect(getByTestId('invite-code-input').props.value).toBe('BAD000'),
  );
  fireEvent.press(getByTestId('invite-code-submit'));

  await waitFor(() => expect(getByTestId('invite-reset')).toBeOnTheScreen());

  // Primary action retries the SAME code (network blips must not force a
  // reset); the secondary reset goes back to the capture phase.
  expect(getByTestId('invite-retry')).toHaveTextContent('Retry');
  expect(getByTestId('invite-reset')).toHaveTextContent('Back');
  expect(getByText('Try a different code')).toBeOnTheScreen();

  // Error text visible, accept not visible
  expect(queryByTestId('invite-accept')).toBeNull();

  // Press reset → back to capture phase (code input visible)
  fireEvent.press(getByTestId('invite-reset'));
  await waitFor(() => expect(getByTestId('invite-code-input')).toBeOnTheScreen());
});
