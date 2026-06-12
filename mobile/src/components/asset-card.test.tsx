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
});
