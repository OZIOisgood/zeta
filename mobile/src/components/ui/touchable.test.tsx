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

test('sets accessibilityState.selected when selected=true', async () => {
  const { getByRole } = await render(
    <Touchable accessibilityLabel="Item" selected={true}><Text>Item</Text></Touchable>,
  );
  expect(getByRole('button', { selected: true })).toBeTruthy();
});

test('does not set accessibilityState.selected when selected is omitted', async () => {
  const { getByRole } = await render(
    <Touchable accessibilityLabel="Item"><Text>Item</Text></Touchable>,
  );
  // selected is omitted → the element should NOT be selected
  expect(getByRole('button', { selected: false })).toBeTruthy();
});
