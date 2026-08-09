import React from 'react';
import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => undefined),
  deleteItemAsync: jest.fn(async () => undefined),
}));
jest.mock('expo-localization', () => ({ getLocales: () => [{ languageCode: 'en' }] }));

const mockBooking = {
  id: 'b1',
  expert_id: 'e1',
  expert_name: 'Coach Ana',
  student_id: 's1',
  student_name: 'Bob Student',
  group_id: 'g1',
  session_type_id: 'st1',
  session_type_name: 'Strategy Session',
  scheduled_at: new Date('2026-06-25T07:45:00Z').toISOString(),
  duration_minutes: 60,
  status: 'pending',
  created_at: '2026-01-01T00:00:00Z',
};

const mockMutateAsync = jest.fn();
jest.mock('../api/queries/coaching', () => ({
  ...jest.requireActual('../api/queries/coaching'),
  useMyBookingsQuery: () => ({ data: [mockBooking], isPending: false, isError: false }),
  useCancelBookingMutation: () => ({ mutateAsync: mockMutateAsync, isPending: false }),
}));

const mockShowToast = jest.fn();
jest.mock('../components/ui/z-toast', () => ({
  ...jest.requireActual('../components/ui/z-toast'),
  showToast: (...args: unknown[]) => mockShowToast(...args),
}));

jest.mock('../auth/auth-store', () => ({
  ...jest.requireActual('../auth/auth-store'),
  useAuth: (selector: (s: { user: { id: string } | null }) => unknown) =>
    selector({ user: { id: 's1' } }),
}));

const mockBack = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: mockBack }),
  useLocalSearchParams: () => ({ bookingId: 'b1', groupId: 'g1' }),
  Stack: { Screen: () => null },
}));

import { initI18n } from '../i18n';
import CancelSessionScreen from '../app/cancel/[bookingId]';

beforeAll(() => initI18n('en'));

let client: QueryClient;
beforeEach(() => {
  mockMutateAsync.mockClear();
  mockShowToast.mockClear();
  mockBack.mockClear();
  client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
});

function Providers({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

test('shows the cancellation context line (counterpart + time)', async () => {
  await render(<Providers><CancelSessionScreen /></Providers>);
  expect(screen.getByText(/This will cancel the session with Coach Ana/)).toBeOnTheScreen();
});

test('confirm with a reason → mutateAsync(bookingId + reason), success toast, back', async () => {
  mockMutateAsync.mockResolvedValueOnce(undefined);
  await render(<Providers><CancelSessionScreen /></Providers>);

  fireEvent.changeText(screen.getByTestId('cancel-reason'), 'Schedule conflict');
  await waitFor(() =>
    expect(screen.getByTestId('cancel-reason').props.value).toBe('Schedule conflict'),
  );

  fireEvent.press(screen.getByTestId('cancel-confirm'));
  await waitFor(() =>
    expect(mockMutateAsync).toHaveBeenCalledWith({ bookingId: 'b1', reason: 'Schedule conflict' }),
  );
  await waitFor(() =>
    expect(mockShowToast).toHaveBeenCalledWith('Success', 'Session cancelled', 'success'),
  );
  await waitFor(() => expect(mockBack).toHaveBeenCalled());
});

test('confirm without a reason → reason undefined', async () => {
  mockMutateAsync.mockResolvedValueOnce(undefined);
  await render(<Providers><CancelSessionScreen /></Providers>);

  fireEvent.press(screen.getByTestId('cancel-confirm'));
  await waitFor(() =>
    expect(mockMutateAsync).toHaveBeenCalledWith({ bookingId: 'b1', reason: undefined }),
  );
});

test('mutateAsync rejects → error text, no toast, stays open', async () => {
  mockMutateAsync.mockRejectedValueOnce(new Error('network'));
  await render(<Providers><CancelSessionScreen /></Providers>);

  fireEvent.press(screen.getByTestId('cancel-confirm'));
  await waitFor(() => expect(screen.getByText('Failed to cancel booking.')).toBeOnTheScreen());
  expect(mockShowToast).not.toHaveBeenCalled();
  expect(mockBack).not.toHaveBeenCalled();
});

test('Keep session dismisses without cancelling', async () => {
  await render(<Providers><CancelSessionScreen /></Providers>);
  fireEvent.press(screen.getByTestId('cancel-keep'));
  expect(mockBack).toHaveBeenCalled();
  expect(mockMutateAsync).not.toHaveBeenCalled();
});
