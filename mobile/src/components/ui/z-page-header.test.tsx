import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import { ZPageHeader } from './z-page-header';

test('renders the title', async () => {
  await render(<ZPageHeader title="Sessions" />);
  expect(screen.getByText('Sessions')).toBeOnTheScreen();
});

test('renders the subtitle when provided', async () => {
  await render(<ZPageHeader title="Sessions" subtitle="Your upcoming and past coaching." />);
  expect(screen.getByText('Your upcoming and past coaching.')).toBeOnTheScreen();
});

test('omits the subtitle when not provided', async () => {
  await render(<ZPageHeader title="Sessions" testID="hdr" />);
  expect(screen.getByTestId('hdr')).toBeOnTheScreen();
  expect(screen.queryByText('Your upcoming and past coaching.')).toBeNull();
});

test('renders the trailing action slot', async () => {
  await render(<ZPageHeader title="Groups" action={<Text>settings</Text>} />);
  expect(screen.getByText('settings')).toBeOnTheScreen();
});
