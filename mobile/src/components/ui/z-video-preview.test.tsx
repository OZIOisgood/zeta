import { render, screen } from '@testing-library/react-native';
import { ZVideoPreview } from './z-video-preview';

test('renders the fallback icon when no thumbnail is provided', async () => {
  await render(<ZVideoPreview testID="preview" />);
  expect(screen.getByTestId('preview')).toBeOnTheScreen();
  expect(screen.queryByLabelText('Kata 1 preview')).toBeNull();
});

test('renders the thumbnail image when a thumbnail is provided', async () => {
  await render(
    <ZVideoPreview
      thumbnail="https://image.mux.com/playback-id/thumbnail.jpg"
      alt="Kata 1 preview"
    />,
  );
  expect(screen.getByLabelText('Kata 1 preview')).toBeOnTheScreen();
});
