import { fireEvent, render, screen } from '@testing-library/react-native';
import { ZTimeGrid } from './z-time-grid';
import type { ZTimeGridSlot } from './z-time-grid.types';

const SLOTS: ZTimeGridSlot[] = [
  { startsAt: '2026-06-18T16:00:00Z', label: '16:00' },
  { startsAt: '2026-06-18T16:45:00Z', label: '16:45' },
];

test('renders one cell per slot', async () => {
  await render(<ZTimeGrid slots={SLOTS} selectedStartsAt="" onSelect={() => {}} testID="grid" />);
  expect(screen.getByText('16:00')).toBeTruthy();
  expect(screen.getByText('16:45')).toBeTruthy();
});

test('calls onSelect with the startsAt on press', async () => {
  const onSelect = jest.fn();
  await render(<ZTimeGrid slots={SLOTS} selectedStartsAt="" onSelect={onSelect} testID="grid" />);
  fireEvent.press(screen.getByTestId('grid-2026-06-18T16:45:00Z'));
  expect(onSelect).toHaveBeenCalledWith('2026-06-18T16:45:00Z');
});

test('renders the hint when provided', async () => {
  await render(
    <ZTimeGrid slots={SLOTS} selectedStartsAt="" onSelect={() => {}} hint="Duration 30 min" testID="grid" />,
  );
  expect(screen.getByText('Duration 30 min')).toBeTruthy();
});
