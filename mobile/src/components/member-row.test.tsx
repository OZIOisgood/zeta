import { render, screen, fireEvent } from '@testing-library/react-native';

import { initI18n } from '../i18n';
import { MemberRow } from './member-row';
import type { GroupUser } from '../api/queries/groups';

// Controls the useScreenReader hook so both interaction modes are testable
// (swipe affordance by default vs. the explicit button screen readers need).
let mockScreenReaderOn = false;
jest.mock('../lib/use-screen-reader', () => ({
  useScreenReader: () => mockScreenReaderOn,
}));

beforeAll(() => initI18n('en'));
afterEach(() => {
  mockScreenReaderOn = false;
});

const MEMBER: GroupUser = {
  id: 'u1',
  email: 'alice@example.com',
  first_name: 'Alice',
  last_name: 'Smith',
  avatar: undefined,
  role: 'student',
};

test('renders the member full name', async () => {
  await render(<MemberRow member={MEMBER} />);
  expect(screen.getByText('Alice Smith')).toBeOnTheScreen();
});

test('does not render a role pill', async () => {
  // The role badge was removed from the member row per the handoff — the row
  // shows name + email only.
  await render(<MemberRow member={MEMBER} />);
  expect(screen.queryByText('Student')).toBeNull();
});

test('renders the member email line', async () => {
  await render(<MemberRow member={MEMBER} />);
  expect(screen.getByText('alice@example.com')).toBeOnTheScreen();
});

test('shows initials when there is no avatar (testID member-initials)', async () => {
  await render(<MemberRow member={MEMBER} />);
  expect(screen.getByTestId('member-initials')).toBeOnTheScreen();
  expect(screen.getByText('AS')).toBeOnTheScreen();
});

test('does not show initials tile when avatar is present', async () => {
  const withAvatar: GroupUser = { ...MEMBER, avatar: 'abc123' };
  await render(<MemberRow member={withAvatar} />);
  expect(screen.queryByTestId('member-initials')).toBeNull();
});

test('shows no remove button when onRemove is omitted', async () => {
  await render(<MemberRow member={MEMBER} />);
  expect(screen.queryByTestId('member-remove')).toBeNull();
});

test('exposes the remove action and fires onRemove when provided', async () => {
  // Removal is a swipe action (SOTA list idiom); the bare ZSwipeable fallback
  // renders it as a persistent accessible control, so it stays testable here.
  const onRemove = jest.fn();
  await render(<MemberRow member={MEMBER} onRemove={onRemove} />);
  // i18n: groups.users.removeUser → "Remove user"
  const action = screen.getByLabelText('Remove user');
  expect(action).toBeOnTheScreen();
  fireEvent.press(action);
  expect(onRemove).toHaveBeenCalledTimes(1);
});

test('screen-reader mode swaps the swipe affordance for an explicit remove button', async () => {
  mockScreenReaderOn = true;
  const onRemove = jest.fn();
  await render(<MemberRow member={MEMBER} onRemove={onRemove} />);
  const btn = screen.getByTestId('member-remove');
  expect(btn).toBeOnTheScreen();
  fireEvent.press(btn);
  expect(onRemove).toHaveBeenCalledTimes(1);
});
