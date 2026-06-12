import { render, screen, userEvent } from '@testing-library/react-native';

jest.mock('expo-localization', () => ({ getLocales: () => [{ languageCode: 'en' }] }));

import { GroupCard } from './group-card';
import type { Group } from '../api/queries/groups';

const GROUP: Group = {
  id: 'g1',
  name: 'Karate Club',
  owner_id: 'u1',
  avatar: null,
  description: 'Front stance and kata fundamentals.',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

test('renders group name and description', async () => {
  await render(<GroupCard group={GROUP} onPress={jest.fn()} />);
  expect(screen.getByText('Karate Club')).toBeOnTheScreen();
  expect(screen.getByText('Front stance and kata fundamentals.')).toBeOnTheScreen();
});

test('fires onPress when pressed', async () => {
  const user = userEvent.setup();
  const onPress = jest.fn();
  await render(<GroupCard group={GROUP} onPress={onPress} />);
  await user.press(screen.getByRole('button', { name: 'Karate Club' }));
  expect(onPress).toHaveBeenCalledTimes(1);
});

test('shows fallback icon when avatar is null (testID group-avatar-fallback)', async () => {
  await render(<GroupCard group={GROUP} onPress={jest.fn()} />);
  expect(screen.getByTestId('group-avatar-fallback')).toBeOnTheScreen();
});

test('does not show fallback when avatar is provided', async () => {
  const withAvatar: Group = { ...GROUP, avatar: 'abc123base64data' };
  await render(<GroupCard group={withAvatar} onPress={jest.fn()} />);
  expect(screen.queryByTestId('group-avatar-fallback')).toBeNull();
});
