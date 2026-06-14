import { render, screen } from '@testing-library/react-native';

jest.mock('expo-router', () => ({ useRouter: () => ({ back: jest.fn(), push: jest.fn() }) }));

const mockUseReportEventsQuery = jest.fn();
jest.mock('../api/queries/reports', () => {
  const actual = jest.requireActual('../api/queries/reports');
  return { ...actual, useReportEventsQuery: () => mockUseReportEventsQuery() };
});

import ReportsScreen from '../app/reports';

const DATA = {
  role: 'expert',
  viewer: { id: 'e1', name: 'Bob' },
  events: [
    {
      kind: 'video',
      group: { id: 'g1', name: 'Karate Club' },
      student: { id: 's1', name: 'Alice' },
      expert: { id: 'e1', name: 'Bob' },
      title: 'Kata review',
      at: new Date().toISOString(),
      duration_seconds: 90,
    },
  ],
};

const PENDING_MOCK = { isPending: true, isError: false, isRefetching: false, data: undefined, refetch: jest.fn() };
const ERROR_MOCK = { isPending: false, isError: true, isRefetching: false, data: undefined, refetch: jest.fn() };
const EMPTY_MOCK = {
  isPending: false,
  isError: false,
  isRefetching: false,
  data: { ...DATA, events: [] },
  refetch: jest.fn(),
};
const DATA_MOCK = { isPending: false, isError: false, isRefetching: false, data: DATA, refetch: jest.fn() };

test('renders skeletons while pending', async () => {
  mockUseReportEventsQuery.mockReturnValue(PENDING_MOCK);
  await render(<ReportsScreen />);
  expect(screen.getByTestId('reports-skeleton')).toBeTruthy();
});

test('header subtitle is absent during pending state', async () => {
  mockUseReportEventsQuery.mockReturnValue(PENDING_MOCK);
  await render(<ReportsScreen />);
  // "0 activities · …" must not appear before data loads
  expect(screen.queryByText(/activities/)).toBeNull();
});

test('header subtitle is absent during error state', async () => {
  mockUseReportEventsQuery.mockReturnValue(ERROR_MOCK);
  await render(<ReportsScreen />);
  expect(screen.queryByText(/activities/)).toBeNull();
});

test('renders the error state with a retry before the empty branch', async () => {
  mockUseReportEventsQuery.mockReturnValue(ERROR_MOCK);
  await render(<ReportsScreen />);
  expect(screen.getByTestId('reports-error-retry')).toBeTruthy();
});

test('renders the empty state when there are no events in the period', async () => {
  mockUseReportEventsQuery.mockReturnValue(EMPTY_MOCK);
  await render(<ReportsScreen />);
  expect(screen.getByTestId('reports-empty')).toBeTruthy();
});

test('renders stat cards and the event in the current month', async () => {
  mockUseReportEventsQuery.mockReturnValue(DATA_MOCK);
  await render(<ReportsScreen />);
  expect(screen.getByTestId('reports-stat-videos')).toBeTruthy();
  expect(screen.getByText('Kata review')).toBeTruthy();
});
