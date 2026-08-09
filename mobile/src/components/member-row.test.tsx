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
  // shows the name only.
  await render(<MemberRow member={MEMBER} />);
  expect(screen.queryByText('Student')).toBeNull();
});

test('never renders the member email', async () => {
  // Group member lists must not expose email addresses (display-name privacy).
  await render(<MemberRow member={MEMBER} />);
  expect(screen.queryByText('alice@example.com')).toBeNull();
});

test('renders display_name when the backend omits first/last name', async () => {
  const member = { id: 'u2', display_name: 'Bea K.', role: 'student' } as GroupUser;
  await render(<MemberRow member={member} />);
  expect(screen.getByText('Bea K.')).toBeOnTheScreen();
  expect(screen.getByText('BK')).toBeOnTheScreen();
});

test('prefers full_name over display_name when the caller may see it', async () => {
  const member = {
    id: 'u3',
    display_name: 'Bea K.',
    full_name: 'Bea Kowalski',
    role: 'student',
  } as GroupUser;
  await render(<MemberRow member={member} />);
  expect(screen.getByText('Bea Kowalski')).toBeOnTheScreen();
});

test('renders without crashing when every name field is missing', async () => {
  // name_pending members carry no name at all — the row must degrade, not throw.
  const member = { id: 'u4', role: 'student', name_pending: true } as GroupUser;
  await render(<MemberRow member={member} />);
  expect(screen.getByTestId('member-initials')).toBeOnTheScreen();
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
