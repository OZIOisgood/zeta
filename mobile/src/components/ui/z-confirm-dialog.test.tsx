import { render, screen, userEvent } from '@testing-library/react-native';
import { Text } from 'react-native';
import { ZConfirmDialog } from './z-confirm-dialog';

test('renders title and description', async () => {
  await render(
    <ZConfirmDialog
      visible
      title="Delete video"
      description="This cannot be undone."
      confirmLabel="Delete"
      cancelLabel="Cancel"
      onConfirm={jest.fn()}
      onCancel={jest.fn()}
    />,
  );
  expect(screen.getByText('Delete video')).toBeOnTheScreen();
  expect(screen.getByText('This cannot be undone.')).toBeOnTheScreen();
});

test('pressing confirm calls onConfirm', async () => {
  const user = userEvent.setup();
  const onConfirm = jest.fn();
  await render(
    <ZConfirmDialog
      visible
      title="Delete video"
      confirmLabel="Delete"
      cancelLabel="Cancel"
      onConfirm={onConfirm}
      onCancel={jest.fn()}
    />,
  );
  await user.press(screen.getByRole('button', { name: 'Delete' }));
  expect(onConfirm).toHaveBeenCalledTimes(1);
});

test('pressing cancel calls onCancel', async () => {
  const user = userEvent.setup();
  const onCancel = jest.fn();
  await render(
    <ZConfirmDialog
      visible
      title="Delete video"
      confirmLabel="Delete"
      cancelLabel="Cancel"
      onConfirm={jest.fn()}
      onCancel={onCancel}
    />,
  );
  await user.press(screen.getByRole('button', { name: 'Cancel' }));
  expect(onCancel).toHaveBeenCalledTimes(1);
});

test('renders the children slot between description and footer', async () => {
  await render(
    <ZConfirmDialog
      visible
      title="Delete video"
      description="This cannot be undone."
      confirmLabel="Delete"
      cancelLabel="Cancel"
      onConfirm={jest.fn()}
      onCancel={jest.fn()}
    >
      <Text>Extra slot content</Text>
    </ZConfirmDialog>,
  );
  expect(screen.getByText('Extra slot content')).toBeOnTheScreen();
});

test('disables the confirm button when confirmDisabled', async () => {
  const user = userEvent.setup();
  const onConfirm = jest.fn();
  await render(
    <ZConfirmDialog
      visible
      title="Delete video"
      confirmLabel="Delete"
      cancelLabel="Cancel"
      confirmDisabled
      onConfirm={onConfirm}
      onCancel={jest.fn()}
    />,
  );
  const confirm = screen.getByRole('button', { name: 'Delete' });
  expect(confirm).toBeDisabled();
  await user.press(confirm);
  expect(onConfirm).not.toHaveBeenCalled();
});

test('hides the cancel button when confirmOnly', async () => {
  await render(
    <ZConfirmDialog
      visible
      title="Heads up"
      confirmLabel="Got it"
      cancelLabel="Cancel"
      confirmOnly
      onConfirm={jest.fn()}
      onCancel={jest.fn()}
    />,
  );
  expect(screen.getByRole('button', { name: 'Got it' })).toBeOnTheScreen();
  expect(screen.queryByRole('button', { name: 'Cancel' })).not.toBeOnTheScreen();
});
