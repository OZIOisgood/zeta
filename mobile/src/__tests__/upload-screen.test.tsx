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
  Stack: { Screen: () => null },
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

test('files step: Next is disabled until a video is picked', async () => {
  const user = userEvent.setup();
  await render(<Providers><UploadScreen /></Providers>);

  // First step shows the file picker; Next is gated on having >=1 file.
  // (testID disambiguates the pick button from the "Select Video" stepper label)
  expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();

  await user.press(screen.getByTestId('upload-pick'));

  expect(screen.getByRole('button', { name: 'Next' })).not.toBeDisabled();
});

test('walk the wizard, submit → calls api.POST, enqueue, router.back', async () => {
  const user = userEvent.setup();
  await render(<Providers><UploadScreen /></Providers>);

  // Step 1: files
  await user.press(screen.getByTestId('upload-pick'));
  await user.press(screen.getByRole('button', { name: 'Next' }));

  // Step 2: details — fill title and select the group
  const titleInput = screen.getByLabelText('Title');
  await user.type(titleInput, 'Kata 1');
  await user.press(screen.getByLabelText('Group')); // open the select modal
  await user.press(screen.getByRole('button', { name: 'Group 1' }));
  await user.press(screen.getByRole('button', { name: 'Next' }));

  // Step 3: review — submit (testID disambiguates from the "Upload" stepper label)
  const submit = screen.getByTestId('upload-submit');
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
