import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, userEvent } from '@testing-library/react-native';
import type { ReactNode } from 'react';

// Must mock before imports that touch native modules
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => undefined),
  deleteItemAsync: jest.fn(async () => undefined),
}));

jest.mock('expo-localization', () => ({ getLocales: () => [{ languageCode: 'en' }] }));

// Mock expo-image-picker so "Pick videos" yields one asset
jest.mock('expo-image-picker', () => ({
  launchImageLibraryAsync: jest.fn(async () => ({
    canceled: false,
    assets: [{ uri: 'file:///a.mp4', fileName: 'a.mp4', width: 0, height: 0 }],
  })),
  MediaTypeOptions: { Videos: 'Videos', Images: 'Images', All: 'All' },
}));

// Mock expo-router
const mockBack = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: mockBack }),
}));

// Mock groups query
const mockUseGroupsQuery = jest.fn();
jest.mock('../api/queries/groups', () => ({
  ...jest.requireActual('../api/queries/groups'),
  useGroupsQuery: () => mockUseGroupsQuery(),
}));

// Mock api.POST and uploadStore.enqueue
const mockApiPost = jest.fn();
jest.mock('../auth/auth-store', () => {
  const actual = jest.requireActual('../auth/auth-store');
  return {
    ...actual,
    api: {
      ...actual.api,
      POST: (...args: unknown[]) => mockApiPost(...args),
    },
  };
});

const mockEnqueue = jest.fn(async () => {});
jest.mock('../upload/upload-store', () => {
  const actual = jest.requireActual('../upload/upload-store');
  return {
    ...actual,
    uploadStore: {
      ...actual.uploadStore,
      getState: () => ({
        ...actual.uploadStore.getState(),
        enqueue: mockEnqueue,
      }),
    },
  };
});

import { initI18n } from '../i18n';
import UploadScreen from '../app/upload';

beforeAll(() => initI18n('en'));

let client: QueryClient;
beforeEach(() => {
  client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  jest.clearAllMocks();
  mockUseGroupsQuery.mockReturnValue({
    isPending: false,
    isError: false,
    data: [{ id: 'g1', name: 'Group 1' }],
    refetch: jest.fn(),
  });
  mockApiPost.mockResolvedValue({
    data: {
      asset_id: 'asset_1',
      videos: [{ id: 'v1', upload_url: 'https://upload.example.com/v1', filename: 'a.mp4' }],
    },
    error: undefined,
  });
});
afterEach(() => client.clear());

function Providers({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

test('submit button disabled until title, group, and file are present', async () => {
  await render(<Providers><UploadScreen /></Providers>);
  const submit = screen.getByRole('button', { name: 'Upload' });
  expect(submit).toBeDisabled();
});

test('fill title, select group, pick file, submit → calls api.POST, enqueue, router.back', async () => {
  const user = userEvent.setup();
  await render(<Providers><UploadScreen /></Providers>);

  // Fill title
  const titleInput = screen.getByLabelText('Title');
  await user.type(titleInput, 'Kata 1');

  // Select group chip
  await user.press(screen.getByRole('button', { name: 'Group 1' }));

  // Pick videos
  await user.press(screen.getByRole('button', { name: 'Pick videos' }));

  // Submit should now be enabled
  const submit = screen.getByRole('button', { name: 'Upload' });
  expect(submit).not.toBeDisabled();
  await user.press(submit);

  expect(mockApiPost).toHaveBeenCalledWith('/assets', {
    body: { title: 'Kata 1', description: '', filenames: ['a.mp4'], group_id: 'g1' },
  });

  expect(mockEnqueue).toHaveBeenCalledWith(
    { asset_id: 'asset_1', videos: [{ id: 'v1', upload_url: 'https://upload.example.com/v1', filename: 'a.mp4' }] },
    [{ filename: 'a.mp4', localUri: 'file:///a.mp4' }],
    'Kata 1',
  );

  expect(mockBack).toHaveBeenCalled();
});
