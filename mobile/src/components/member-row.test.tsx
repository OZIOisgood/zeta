import { render, screen } from '@testing-library/react-native';

import { initI18n } from '../i18n';
import { MemberRow } from './member-row';
import type { GroupUser } from '../api/queries/groups';

beforeAll(() => initI18n('en'));

const MEMBER: GroupUser = {
  id: 'u1',
  email: 'alice@example.com',
  first_name: 'Alice',
  last_name: 'Smith',
  avatar: undefined,
  role: 'student',
};

test('renders full name and role', async () => {
  await render(<MemberRow member={MEMBER} />);
  expect(screen.getByText('Alice Smith')).toBeOnTheScreen();
  expect(screen.getByText('Student')).toBeOnTheScreen();
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
