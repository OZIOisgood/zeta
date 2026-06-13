import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import { ZEmptyState } from './z-empty-state';

test('renders the title and description', async () => {
  await render(<ZEmptyState title="No videos yet" description="Upload a video to get started." />);
  expect(screen.getByText('No videos yet')).toBeOnTheScreen();
  expect(screen.getByText('Upload a video to get started.')).toBeOnTheScreen();
});

test('renders children when provided', async () => {
  await render(
    <ZEmptyState title="No videos yet" description="Upload a video to get started.">
      <Text>Upload</Text>
    </ZEmptyState>,
  );
  expect(screen.getByText('Upload')).toBeOnTheScreen();
});

test('renders a custom icon when provided', async () => {
  await render(
    <ZEmptyState
      title="Something went wrong"
      description="We could not load your videos."
      icon={<Text testID="error-icon">!</Text>}
    />,
  );
  expect(screen.getByTestId('error-icon')).toBeOnTheScreen();
});
