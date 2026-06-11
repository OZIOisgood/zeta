import { render, screen } from '@testing-library/react-native';

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => undefined),
  deleteItemAsync: jest.fn(async () => undefined),
}));

import { authStore } from '../auth/auth-store';
import type { Me } from '../auth/auth-store';
import ProfileScreen from '../app/(tabs)/profile';

const ME: Me = {
  id: 'user_1', first_name: 'Heinrich', last_name: 'Mergel', email: 'h@example.test',
  language: 'en', avatar: '', timezone: 'Europe/Berlin', role: 'student', permissions: [],
  email_preferences: {
    notifications_enabled: true, asset_uploads_enabled: true, asset_reviews_enabled: true,
    invitation_updates_enabled: true, group_membership_updates_enabled: true,
    coaching_booking_updates_enabled: true, coaching_reminders_enabled: true,
  },
};

test('shows the signed-in user and a sign-out button', async () => {
  authStore.setState({ status: 'signedIn', user: ME });
  await render(<ProfileScreen />);

  expect(screen.getByText('Heinrich Mergel')).toBeOnTheScreen();
  expect(screen.getByText('h@example.test')).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: 'Sign out' })).toBeOnTheScreen();
});
