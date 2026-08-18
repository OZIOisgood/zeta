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

// Two separate presses (accept then decline) fired back-to-back in ONE test,
// without an intervening render/cleanup, corrupt react-test-renderer's act()
// bookkeeping for whatever test runs next in this file (confirmed by bisection:
// either press alone is clean; the pair is not, and no post-press act()/timer
// flush recovers it — this file previously got away with it only because that
// was the last test). Kept as two single-press tests so each gets its own
// render + auto afterEach(cleanup) between them.
test('renders accept/decline for an actionable invite and fires onAccept when pressed', async () => {
  const onAccept = jest.fn();
  const item = make({
    type: 'group_invitation_received',
    payload: { group_name: 'Karate', inviter_name: 'Sam', code: 'aB3xZ9' },
    invite_status: 'pending',
    read: false,
  });
  const { getByTestId } = await render(
    <NotificationRow item={item} onOpen={noop} onAccept={onAccept} onDecline={noop} />,
  );
  fireEvent.press(getByTestId('notification-accept-n1'));
  expect(onAccept).toHaveBeenCalledWith(item);
});

test('renders accept/decline for an actionable invite and fires onDecline when pressed', async () => {
  const onDecline = jest.fn();
  const item = make({
    type: 'group_invitation_received',
    payload: { group_name: 'Karate', inviter_name: 'Sam', code: 'aB3xZ9' },
    invite_status: 'pending',
    read: false,
  });
  const { getByTestId } = await render(
    <NotificationRow item={item} onOpen={noop} onAccept={noop} onDecline={onDecline} />,
  );
  fireEvent.press(getByTestId('notification-decline-n1'));
  expect(onDecline).toHaveBeenCalledWith(item);
});

test('a booking notification renders the formatted appointment time', async () => {
  const item = make({
    id: 'n-booking',
    type: 'coaching_booking_created',
    payload: { student_name: 'Lena', scheduled_at: '2026-08-21T12:15:00Z' },
    read: true,
  });
  const { getByText } = await render(
    <NotificationRow item={item} onOpen={noop} onAccept={noop} onDecline={noop} />,
  );

  // The t() mock echoes interpolation params, so the row's text node literally
  // contains `...coachingBookingCreated|{"student":"Lena",...,"when":"<time>"}`.
  // Matching that node directly keeps the assertion free of JSON escaping and
  // independent of the emulator's locale — it only asserts `when` is non-empty.
  expect(getByText(/coachingBookingCreated\|.*"when":"[^"]+"/)).toBeTruthy();
});
