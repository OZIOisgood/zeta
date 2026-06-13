import { render, screen, userEvent } from '@testing-library/react-native';
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
