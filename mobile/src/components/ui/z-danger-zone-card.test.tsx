import { render, screen, userEvent } from '@testing-library/react-native';
import { initI18n } from '../../i18n';
import { ZDangerZoneCard } from './z-danger-zone-card';

beforeAll(async () => {
  await initI18n('en');
});

const baseProps = {
  title: 'Delete group',
  description: 'This removes the group and its memberships for everyone.',
  actionLabel: 'Delete group',
  confirmTitle: 'Delete this group?',
  confirmMessage: 'This cannot be undone.',
  confirmLabel: 'Delete',
};

test('renders the title, description, and action label', async () => {
  await render(<ZDangerZoneCard {...baseProps} onAction={jest.fn()} />);
  // title and actionLabel share the same string; getAllByText handles duplicates.
  const titleMatches = screen.getAllByText('Delete group');
  expect(titleMatches.length).toBeGreaterThanOrEqual(1);
  expect(
    screen.getByText('This removes the group and its memberships for everyone.'),
  ).toBeOnTheScreen();
});

test('pressing the action opens the confirm dialog', async () => {
  const user = userEvent.setup();
  await render(<ZDangerZoneCard {...baseProps} onAction={jest.fn()} testID="dz" />);
  expect(screen.queryByText('Delete this group?')).toBeNull();
  await user.press(screen.getByRole('button', { name: 'Delete group' }));
  expect(screen.getByText('Delete this group?')).toBeOnTheScreen();
  expect(screen.getByText('This cannot be undone.')).toBeOnTheScreen();
});

test('confirming calls onAction once and closes the dialog', async () => {
  const user = userEvent.setup();
  const onAction = jest.fn();
  await render(<ZDangerZoneCard {...baseProps} onAction={onAction} />);
  await user.press(screen.getByRole('button', { name: 'Delete group' }));
  await user.press(screen.getByRole('button', { name: 'Delete' }));
  expect(onAction).toHaveBeenCalledTimes(1);
  expect(screen.queryByText('Delete this group?')).toBeNull();
});

test('cancelling does not call onAction', async () => {
  const user = userEvent.setup();
  const onAction = jest.fn();
  await render(<ZDangerZoneCard {...baseProps} onAction={onAction} />);
  await user.press(screen.getByRole('button', { name: 'Delete group' }));
  await user.press(screen.getByRole('button', { name: 'Cancel' }));
  expect(onAction).not.toHaveBeenCalled();
  expect(screen.queryByText('Delete this group?')).toBeNull();
});

test('loading shows a spinner and disables the confirm', async () => {
  const user = userEvent.setup();
  await render(<ZDangerZoneCard {...baseProps} onAction={jest.fn()} loading testID="dz" />);
  expect(screen.getByTestId('dz-action-spinner')).toBeOnTheScreen();
  // The trigger is disabled while loading, so the dialog cannot open.
  await user.press(screen.getByRole('button', { name: 'Delete group' }));
  expect(screen.queryByText('Delete this group?')).toBeNull();
});

test('disabled blocks the trigger', async () => {
  const user = userEvent.setup();
  const onAction = jest.fn();
  await render(<ZDangerZoneCard {...baseProps} onAction={onAction} disabled />);
  const trigger = screen.getByRole('button', { name: 'Delete group' });
  expect(trigger).toBeDisabled();
  await user.press(trigger);
  expect(screen.queryByText('Delete this group?')).toBeNull();
  expect(onAction).not.toHaveBeenCalled();
});
