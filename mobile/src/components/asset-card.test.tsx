import { render, screen, userEvent } from '@testing-library/react-native';

jest.mock('expo-localization', () => ({ getLocales: () => [{ languageCode: 'en' }] }));

import { initI18n } from '../i18n';
import { AssetCard } from './asset-card';

beforeAll(() => initI18n('en'));

const ASSET = {
  id: 'a1', title: 'Kata 1', description: 'desc', owner_id: 'u1',
  status: 'pending' as const, review_count: 3,
  thumbnail: 'https://image.mux.com/pb1/thumbnail.png',
};

test('shows title, review count and fires onPress', async () => {
  const user = userEvent.setup();
  const onPress = jest.fn();
  await render(<AssetCard asset={ASSET} onPress={onPress} />);
  await user.press(screen.getByRole('button', { name: 'Kata 1' }));
  expect(onPress).toHaveBeenCalledTimes(1);
  expect(screen.getByText('Kata 1')).toBeOnTheScreen();
  expect(screen.getByText('3')).toBeOnTheScreen();
});

test('completed assets show the reviewed badge', async () => {
  await render(<AssetCard asset={{ ...ASSET, status: 'completed' }} onPress={jest.fn()} />);
  expect(screen.getByTestId('asset-status-completed')).toBeOnTheScreen();
  expect(screen.getByText('Reviewed')).toBeOnTheScreen();
});

test('waiting_upload assets show the localized uploading label', async () => {
  await render(<AssetCard asset={{ ...ASSET, status: 'waiting_upload' }} onPress={jest.fn()} />);
  expect(screen.getByTestId('asset-status-waiting_upload')).toBeOnTheScreen();
  expect(screen.getByText('Uploading…')).toBeOnTheScreen();
});

test('renders the description as the secondary line', async () => {
  await render(<AssetCard asset={ASSET} onPress={jest.fn()} />);
  expect(screen.getByText('desc')).toBeOnTheScreen();
});

test('uses the group name as the single secondary line, hiding the description', async () => {
  // Mirror the web card: group name takes the secondary line and the description
  // is not shown so the group name never renders twice.
  await render(
    <AssetCard
      asset={{ ...ASSET, description: 'My kata', group: { id: 'g1', name: 'Brown Belts' } }}
      onPress={jest.fn()}
    />,
  );
  expect(screen.getByText('Brown Belts')).toBeOnTheScreen();
  expect(screen.queryByText('My kata')).toBeNull();
});

test('uses the group name as the secondary line when there is no description', async () => {
  await render(
    <AssetCard
      asset={{ ...ASSET, description: '', group: { id: 'g1', name: 'Blue Belts' } }}
      onPress={jest.fn()}
    />,
  );
  // The group name renders exactly once as the single secondary line.
  expect(screen.getAllByText('Blue Belts')).toHaveLength(1);
});

test('exposes the review count as an accessible comment count', async () => {
  await render(<AssetCard asset={ASSET} onPress={jest.fn()} />);
  expect(screen.getByLabelText('Comments: 3')).toBeOnTheScreen();
});
