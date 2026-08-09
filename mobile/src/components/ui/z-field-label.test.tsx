import { render, screen } from '@testing-library/react-native';
import { ZFieldLabel } from './z-field-label';

test('renders the label', async () => {
  await render(<ZFieldLabel label="Email" />);
  expect(screen.getByText('Email')).toBeOnTheScreen();
});

test('hides the required asterisk by default', async () => {
  await render(<ZFieldLabel label="Email" />);
  expect(screen.queryByText('*')).not.toBeOnTheScreen();
});

test('shows the required asterisk when required', async () => {
  await render(<ZFieldLabel label="Email" required />);
  expect(screen.getByText('*')).toBeOnTheScreen();
});
