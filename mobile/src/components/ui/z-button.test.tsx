import { render, screen, userEvent } from '@testing-library/react-native';
import { ZButton } from './z-button';

test('renders label and fires onPress', async () => {
  const user = userEvent.setup();
  const onPress = jest.fn();
  await render(<ZButton label="Save" onPress={onPress} />);
  await user.press(screen.getByRole('button', { name: 'Save' }));
  expect(onPress).toHaveBeenCalledTimes(1);
});

test('disabled button does not fire onPress', async () => {
  const user = userEvent.setup();
  const onPress = jest.fn();
  await render(<ZButton label="Save" onPress={onPress} disabled />);
  await user.press(screen.getByRole('button', { name: 'Save' }));
  expect(onPress).not.toHaveBeenCalled();
});
