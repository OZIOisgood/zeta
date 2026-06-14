import { cleanup, fireEvent, render } from '@testing-library/react-native';
import { NotificationRow } from './notification-row';
import type { NotificationItem } from '../api/queries/notifications';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) =>
      opts ? `${key}|${JSON.stringify(opts)}` : key,
  }),
}));

afterEach(() => cleanup());

function make(partial: Partial<NotificationItem>): NotificationItem {
  return {
    id: 'n1',
    type: 'group_member_joined',
    payload: { member_name: 'Lee', group_name: 'Karate', group_id: 'g1' },
    read: true,
    created_at: new Date().toISOString(),
    ...partial,
  } as NotificationItem;
}

const noop = () => undefined;

test('renders the type message and fires onOpen when pressed', async () => {
  const onOpen = jest.fn();
  const { getByText, getByTestId } = await render(
    <NotificationRow item={make({})} onOpen={onOpen} onAccept={noop} onDecline={noop} />,
  );
  expect(getByText(/notifications\.types\.groupMemberJoined/)).toBeTruthy();
  fireEvent.press(getByTestId('notification-row-n1'));
  expect(onOpen).toHaveBeenCalledTimes(1);
});

test('shows an unread dot only when the item is unread', async () => {
  const { rerender, queryByTestId } = await render(
    <NotificationRow item={make({ read: false })} onOpen={noop} onAccept={noop} onDecline={noop} />,
  );
  expect(queryByTestId('notification-unread-dot')).toBeTruthy();
  await rerender(
    <NotificationRow item={make({ read: true })} onOpen={noop} onAccept={noop} onDecline={noop} />,
  );
  expect(queryByTestId('notification-unread-dot')).toBeNull();
});

test('hides accept/decline once the invite is resolved or expired', async () => {
  const resolved = make({
    type: 'group_invitation_received',
    payload: { group_name: 'Karate', code: 'aB3xZ9' },
    invite_status: 'accepted',
  });
  const { queryByTestId, getByText } = await render(
    <NotificationRow item={resolved} onOpen={noop} onAccept={noop} onDecline={noop} />,
  );
  expect(queryByTestId('notification-accept-n1')).toBeNull();
  expect(getByText(/notifications\.invite\.accepted/)).toBeTruthy();
});

test('renders accept/decline for an actionable invite and wires the callbacks', async () => {
  const onAccept = jest.fn();
  const onDecline = jest.fn();
  const item = make({
    type: 'group_invitation_received',
    payload: { group_name: 'Karate', inviter_name: 'Sam', code: 'aB3xZ9' },
    invite_status: 'pending',
    read: false,
  });
  const { getByTestId } = await render(
    <NotificationRow item={item} onOpen={noop} onAccept={onAccept} onDecline={onDecline} />,
  );
  fireEvent.press(getByTestId('notification-accept-n1'));
  fireEvent.press(getByTestId('notification-decline-n1'));
  expect(onAccept).toHaveBeenCalledWith(item);
  expect(onDecline).toHaveBeenCalledWith(item);
});
