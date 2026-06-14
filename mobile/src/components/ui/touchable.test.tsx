import { render, fireEvent } from '@testing-library/react-native';
import { Text } from 'react-native';
import { Touchable } from './touchable';

test('fires onPress when enabled', async () => {
  const onPress = jest.fn();
  const { getByText } = await render(<Touchable onPress={onPress}><Text>Tap</Text></Touchable>);
  fireEvent.press(getByText('Tap'));
  expect(onPress).toHaveBeenCalledTimes(1);
});

test('does not fire when disabled', async () => {
  const onPress = jest.fn();
  const { getByText } = await render(<Touchable onPress={onPress} disabled><Text>Tap</Text></Touchable>);
  fireEvent.press(getByText('Tap'));
  expect(onPress).not.toHaveBeenCalled();
});
