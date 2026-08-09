import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import { ZKeyboardAvoidingView } from './z-keyboard-avoiding-view';

test('renders its children', async () => {
  await render(
    <ZKeyboardAvoidingView>
      <Text>Sign in</Text>
    </ZKeyboardAvoidingView>,
  );
  expect(screen.getByText('Sign in')).toBeOnTheScreen();
});
