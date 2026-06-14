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

test('renders skeletons while pending', async () => {
  mockUseReportEventsQuery.mockReturnValue({ isPending: true, isError: false, data: undefined, refetch: jest.fn() });
  await render(<ReportsScreen />);
  expect(screen.getByTestId('reports-skeleton')).toBeTruthy();
});

test('renders the error state with a retry before the empty branch', async () => {
  const refetch = jest.fn();
  mockUseReportEventsQuery.mockReturnValue({ isPending: false, isError: true, data: undefined, refetch });
  await render(<ReportsScreen />);
  expect(screen.getByTestId('reports-error-retry')).toBeTruthy();
});

test('renders the empty state when there are no events in the period', async () => {
  mockUseReportEventsQuery.mockReturnValue({
    isPending: false,
    isError: false,
    data: { ...DATA, events: [] },
    refetch: jest.fn(),
  });
  await render(<ReportsScreen />);
  expect(screen.getByTestId('reports-empty')).toBeTruthy();
});

test('renders stat cards and the event in the current month', async () => {
  mockUseReportEventsQuery.mockReturnValue({ isPending: false, isError: false, data: DATA, refetch: jest.fn() });
  await render(<ReportsScreen />);
  expect(screen.getByTestId('reports-stat-videos')).toBeTruthy();
  expect(screen.getByText('Kata review')).toBeTruthy();
});
