import { render, screen, userEvent } from '@testing-library/react-native';
import { ZSeekChip } from './z-seek-chip';

test('renders the timecode label', async () => {
  await render(<ZSeekChip label="0:12" />);
  expect(screen.getByText('0:12')).toBeOnTheScreen();
});

test('fires onPress when the pill is pressed', async () => {
  const user = userEvent.setup();
  const onPress = jest.fn();
  await render(<ZSeekChip label="0:12" onPress={onPress} testID="seek" />);
  await user.press(screen.getByTestId('seek'));
  expect(onPress).toHaveBeenCalledTimes(1);
});

test('exposes the accessibility label and is queryable by role', async () => {
  await render(<ZSeekChip label="0:12" accessibilityLabel="Jump to 0:12" />);
  expect(screen.getByRole('button', { name: 'Jump to 0:12' })).toBeOnTheScreen();
});

test('applies the testID and renders the accent-container pill', async () => {
  await render(<ZSeekChip label="0:12" testID="seek" />);
  const pill = screen.getByTestId('seek');
  expect(pill).toBeOnTheScreen();
  expect(pill.props.className).toContain('bg-accent-container');
  expect(pill.props.className).toContain('rounded-full');
  const label = screen.getByText('0:12');
  expect(label.props.className).toContain('text-on-accent-container');
  expect(label.props.className).toContain('font-bold');
});
