import { render, screen } from '@testing-library/react-native';
import { ZAvatar } from './z-avatar';

test('renders fallback initials when no image is provided', async () => {
  await render(<ZAvatar fallback="HM" />);
  expect(screen.getByText('HM')).toBeOnTheScreen();
});

test('renders an image when an image is provided', async () => {
  await render(<ZAvatar image="abc123" alt="Jane Doe" />);
  expect(screen.getByLabelText('Jane Doe')).toBeOnTheScreen();
});
