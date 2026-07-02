import { render, screen } from '@testing-library/react-native';
import { ZFieldError } from './z-field-error';

test('renders the message', async () => {
  await render(<ZFieldError message="Email is required" />);
  expect(screen.getByText('Email is required')).toBeOnTheScreen();
});
