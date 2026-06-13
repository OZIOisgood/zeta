import { render, screen, userEvent } from '@testing-library/react-native';

jest.mock('expo-localization', () => ({ getLocales: () => [{ languageCode: 'en' }] }));

import { initI18n } from '../i18n';
import { UploadProgressCard } from './upload-progress-card';
import type { UploadJob } from '../upload/upload-store';

beforeAll(() => initI18n('en'));

function job(overrides?: Partial<UploadJob>): UploadJob {
  return {
    id: 'asset_1',
    title: 'Kata 1',
    status: 'uploading',
    files: [
      { videoId: 'v1', uploadUrl: 'u1', localUri: 'f1', filename: 'a.mp4', progress: 1, status: 'done' },
      { videoId: 'v2', uploadUrl: 'u2', localUri: 'f2', filename: 'b.mp4', progress: 0.4, status: 'uploading' },
    ],
    ...overrides,
  };
}

test('shows title and file counter while uploading', async () => {
  await render(<UploadProgressCard job={job()} onRetry={jest.fn()} onDismiss={jest.fn()} />);
  expect(screen.getByText('Kata 1')).toBeOnTheScreen();
  expect(screen.getByText('1/2')).toBeOnTheScreen();
});

test('failed job shows retry with localized label', async () => {
  const onRetry = jest.fn();
  const failed = job({
    status: 'failed',
    files: [{ videoId: 'v1', uploadUrl: 'u1', localUri: 'f1', filename: 'a.mp4', progress: 0, status: 'failed' }],
  });
  const user = userEvent.setup();
  await render(<UploadProgressCard job={failed} onRetry={onRetry} onDismiss={jest.fn()} />);
  expect(screen.getByLabelText('Retry')).toBeOnTheScreen();
  await user.press(screen.getByTestId('upload-retry'));
  expect(onRetry).toHaveBeenCalledWith('asset_1', 'v1');
});

test('done job shows dismiss with localized label', async () => {
  const onDismiss = jest.fn();
  const done = job({ status: 'done', files: job().files.map((f) => ({ ...f, status: 'done' as const, progress: 1 })) });
  const user = userEvent.setup();
  await render(<UploadProgressCard job={done} onRetry={jest.fn()} onDismiss={onDismiss} />);
  expect(screen.getByLabelText('Close')).toBeOnTheScreen();
  await user.press(screen.getByTestId('upload-dismiss'));
  expect(onDismiss).toHaveBeenCalledWith('asset_1');
});
