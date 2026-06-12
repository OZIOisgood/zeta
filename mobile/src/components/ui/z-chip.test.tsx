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
