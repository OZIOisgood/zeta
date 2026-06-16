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

test('labels the fallback-initials branch for screen readers', async () => {
  await render(<ZAvatar fallback="JD" alt="Jane Doe" />);
  expect(screen.getByLabelText('Jane Doe')).toBeOnTheScreen();
  expect(screen.getByText('JD')).toBeOnTheScreen();
});

test('renders with the circle shape', async () => {
  await render(<ZAvatar fallback="HM" shape="circle" testID="avatar" />);
  expect(screen.getByTestId('avatar')).toBeOnTheScreen();
  expect(screen.getByText('HM')).toBeOnTheScreen();
});

test('accent tone uses accent-container background and on-accent-container text', async () => {
  await render(<ZAvatar fallback="HM" tone="accent" testID="av" />);
  expect(screen.getByTestId('av').props.className).toContain('bg-accent-container');
  expect(screen.getByText('HM').props.className).toContain('text-on-accent-container');
});
