import { fireEvent, render, screen } from '@testing-library/react-native';
import { ZDateRail } from './z-date-rail';
import type { ZDateRailDay } from './z-date-rail.types';

const DAYS: ZDateRailDay[] = [
  { key: 'Tue Jun 18 2026', label: 'Today', day: '18', month: 'Jun', isToday: true },
  { key: 'Wed Jun 19 2026', label: 'Wed', day: '19', month: 'Jun' },
];

test('renders one pill per day and labels them', async () => {
  await render(<ZDateRail days={DAYS} selectedKey="" onSelect={() => {}} testID="rail" />);
  expect(screen.getByText('Today')).toBeTruthy();
  expect(screen.getByText('19')).toBeTruthy();
});

test('calls onSelect with the day key on press', async () => {
  const onSelect = jest.fn();
  await render(<ZDateRail days={DAYS} selectedKey="" onSelect={onSelect} testID="rail" />);
  fireEvent.press(screen.getByTestId('rail-1'));
  expect(onSelect).toHaveBeenCalledWith('Wed Jun 19 2026');
});

test('marks the selected day as selected for a11y', async () => {
  await render(<ZDateRail days={DAYS} selectedKey="Tue Jun 18 2026" onSelect={() => {}} testID="rail" />);
  expect(screen.getByTestId('rail-0').props.accessibilityState).toMatchObject({ selected: true });
});

test('disabled day blocks press and is announced disabled', async () => {
  const onSelect = jest.fn();
  const days: ZDateRailDay[] = [
    { key: 'Thu Jun 18 2026', label: 'Thu', day: '18', month: 'Jun', disabled: true },
  ];
  await render(<ZDateRail days={days} selectedKey="" onSelect={onSelect} testID="rail" />);
  fireEvent.press(screen.getByTestId('rail-0'));
  expect(onSelect).not.toHaveBeenCalled();
  expect(screen.getByTestId('rail-0').props.accessibilityState).toMatchObject({ disabled: true });
});
