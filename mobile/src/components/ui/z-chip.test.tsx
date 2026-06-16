import { render, screen, userEvent } from '@testing-library/react-native';
import { ZChip } from './z-chip';

test('fires onPress and reflects selection state', async () => {
  const user = userEvent.setup();
  const onPress = jest.fn();
  await render(<ZChip label="Group 1" onPress={onPress} />);
  const chip = screen.getByRole('button', { name: 'Group 1' });
  expect(chip).not.toBeSelected();
  await user.press(chip);
  expect(onPress).toHaveBeenCalledTimes(1);
});

test('selected chip exposes the selected accessibility state', async () => {
  await render(<ZChip label="Group 1" selected />);
  expect(screen.getByRole('button', { name: 'Group 1' })).toBeSelected();
});

test('selected chip renders the secondary-container on-state with a 12dp radius and bold label', async () => {
  await render(<ZChip label="Group 1" selected testID="chip" />);
  const chip = screen.getByTestId('chip');
  expect(chip.props.className).toContain('bg-secondary-container');
  expect(chip.props.className).toContain('border-secondary-container');
  expect(chip.props.className).toContain('rounded-xl');
  const label = screen.getByText('Group 1');
  expect(label.props.className).toContain('text-on-secondary-container');
  expect(label.props.className).toContain('font-bold');
});

test('selected chip shows a leading check glyph by default', async () => {
  await render(<ZChip label="Group 1" selected testID="chip" />);
  expect(screen.getByTestId('chip-check')).toBeOnTheScreen();
});

test('selected chip hides the leading check when showCheck is false', async () => {
  await render(<ZChip label="Group 1" selected showCheck={false} testID="chip" />);
  expect(screen.queryByTestId('chip-check')).toBeNull();
});

test('unselected chip renders the outlined surface look without a check', async () => {
  await render(<ZChip label="Group 1" testID="chip" />);
  const chip = screen.getByTestId('chip');
  expect(chip.props.className).toContain('border-outline');
  expect(chip.props.className).toContain('bg-surface');
  expect(screen.queryByTestId('chip-check')).toBeNull();
});
