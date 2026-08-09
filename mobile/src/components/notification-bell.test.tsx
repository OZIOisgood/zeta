import { cleanup, fireEvent, render } from '@testing-library/react-native';
import { NotificationBell } from './notification-bell';

jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k }) }));

afterEach(() => cleanup());

test('renders the bell and calls onPress', async () => {
  const onPress = jest.fn();
  const { getByTestId } = await render(<NotificationBell unreadCount={0} onPress={onPress} />);
  fireEvent.press(getByTestId('notification-bell'));
  expect(onPress).toHaveBeenCalledTimes(1);
});

test('hides the badge when there are no unread notifications', async () => {
  const { queryByTestId } = await render(<NotificationBell unreadCount={0} onPress={() => undefined} />);
  expect(queryByTestId('notification-bell-badge')).toBeNull();
});

test('shows the exact count up to 9 and 9+ above', async () => {
  const { getByTestId, rerender } = await render(<NotificationBell unreadCount={3} onPress={() => undefined} />);
  expect(getByTestId('notification-bell-badge')).toHaveTextContent('3');
  await rerender(<NotificationBell unreadCount={42} onPress={() => undefined} />);
  expect(getByTestId('notification-bell-badge')).toHaveTextContent('9+');
});
