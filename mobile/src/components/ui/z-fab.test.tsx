import { render, screen, userEvent } from '@testing-library/react-native';
import { Text } from 'react-native';
import { ZFab } from './z-fab';

test('renders an extended fab with label and fires onPress', async () => {
  const onPress = jest.fn();
  await render(<ZFab label="Upload" icon={<Text>+</Text>} onPress={onPress} testID="fab" />);
  expect(screen.getByText('Upload')).toBeOnTheScreen();
  await userEvent.setup().press(screen.getByTestId('fab'));
  expect(onPress).toHaveBeenCalled();
});

test('hides the label when not extended', async () => {
  await render(<ZFab label="Upload" icon={<Text>+</Text>} onPress={() => {}} extended={false} testID="fab" />);
  expect(screen.queryByText('Upload')).toBeNull();
});
