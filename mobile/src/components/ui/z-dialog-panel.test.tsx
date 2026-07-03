import { Text } from 'react-native';
import { render, screen, userEvent } from '@testing-library/react-native';
import { ZDialogPanel } from './z-dialog-panel';

test('does not render children when not visible', async () => {
  await render(
    <ZDialogPanel visible={false} onClose={jest.fn()}>
      <Text>Panel body</Text>
    </ZDialogPanel>,
  );
  expect(screen.queryByText('Panel body')).not.toBeOnTheScreen();
});

test('renders children when visible', async () => {
  await render(
    <ZDialogPanel visible onClose={jest.fn()}>
      <Text>Panel body</Text>
    </ZDialogPanel>,
  );
  expect(screen.getByText('Panel body')).toBeOnTheScreen();
});

test('pressing the backdrop calls onClose', async () => {
  const user = userEvent.setup();
  const onClose = jest.fn();
  await render(
    <ZDialogPanel visible onClose={onClose}>
      <Text>Panel body</Text>
    </ZDialogPanel>,
  );
  await user.press(screen.getByLabelText('Close'));
  expect(onClose).toHaveBeenCalledTimes(1);
});

test('uses the closeLabel prop for the backdrop accessibility label', async () => {
  const user = userEvent.setup();
  const onClose = jest.fn();
  await render(
    <ZDialogPanel visible onClose={onClose} closeLabel="Schließen">
      <Text>Panel body</Text>
    </ZDialogPanel>,
  );
  await user.press(screen.getByLabelText('Schließen'));
  expect(onClose).toHaveBeenCalledTimes(1);
});

test('pressing the panel does not call onClose', async () => {
  const user = userEvent.setup();
  const onClose = jest.fn();
  await render(
    <ZDialogPanel visible onClose={onClose} testID="panel">
      <Text>Panel body</Text>
    </ZDialogPanel>,
  );
  await user.press(screen.getByTestId('panel'));
  expect(onClose).not.toHaveBeenCalled();
});
