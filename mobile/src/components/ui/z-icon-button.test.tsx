import { Text } from 'react-native';
import { render, screen, userEvent } from '@testing-library/react-native';
import { ZIconButton } from './z-icon-button';

test('exposes the label and fires onPress', async () => {
  const user = userEvent.setup();
  const onPress = jest.fn();
  await render(
    <ZIconButton label="Close" onPress={onPress}>
      <Text>×</Text>
    </ZIconButton>,
  );
  await user.press(screen.getByRole('button', { name: 'Close' }));
  expect(onPress).toHaveBeenCalledTimes(1);
});

test('disabled icon button does not fire onPress', async () => {
  const user = userEvent.setup();
  const onPress = jest.fn();
  await render(
    <ZIconButton label="Close" onPress={onPress} disabled>
      <Text>×</Text>
    </ZIconButton>,
  );
  await user.press(screen.getByRole('button', { name: 'Close' }));
  expect(onPress).not.toHaveBeenCalled();
});
