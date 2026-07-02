import { fireEvent, render } from '@testing-library/react-native';
import { NotificationRow } from './notification-row';
import type { NotificationItem } from '../api/queries/notifications';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) =>
      opts ? `${key}|${JSON.stringify(opts)}` : key,
  }),
}));

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

// ── upload icon tone alignment with web ───────────────────────────────────────
// The web notification-list iconClasses returns bg-[var(--z-surface-warm)] /
// text-[var(--z-primary-strong)] for the 'upload' type (default case). The
// mobile ZIconTile must use tone='neutral' (bg-z-surface-warm) not 'primary'
// (bg-z-primary-soft). jest-expo preserves NativeWind className strings in
// toJSON() so we assert on them directly.

function collectClassNames(node: unknown): string {
  if (!node || typeof node !== 'object') return '';
  const rec = node as { props?: { className?: string }; children?: unknown };
  const own = rec.props?.className ?? '';
  const children = rec.children;
  const arr = Array.isArray(children) ? children : children != null ? [children] : [];
  return [own, ...arr.map(collectClassNames)].join(' ');
}

// Run the tone test FIRST to avoid any leakage from the rerender test below.
test('upload notification uses neutral ZIconTile tone (bg-z-surface-warm, not bg-z-primary-soft)', async () => {
  const uploadItem = make({
    id: 'n-upload',
    type: 'video_uploaded',
    payload: { uploader_name: 'Sam', group_name: 'Yoga', video_title: 'clip.mp4', asset_id: 'a1' },
    read: true,
  });
  const { toJSON } = await render(
    <NotificationRow item={uploadItem} onOpen={noop} onAccept={noop} onDecline={noop} />,
  );
  const allClasses = collectClassNames(toJSON());
  // The ZIconTile for upload must use 'neutral' tone → bg-z-surface-warm surface.
  // (The Pressable wrapper also carries active:bg-z-surface-warm, so this assertion
  //  confirms the class is present regardless of which element it's on.)
  expect(allClasses).toContain('bg-z-surface-warm');
  // 'primary' tone would produce bg-z-primary-soft — must be absent.
  expect(allClasses).not.toContain('bg-z-primary-soft');
});

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
