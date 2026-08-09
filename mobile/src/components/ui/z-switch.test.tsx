import { fireEvent, render, screen } from '@testing-library/react-native';
import { ZSwitch } from './z-switch';

test('renders a switch reflecting the unchecked state', async () => {
  await render(
    <ZSwitch checked={false} onChange={jest.fn()} accessibilityLabel="Enable notifications" />,
  );
  const sw = screen.getByRole('switch', { name: 'Enable notifications' });
  expect(sw).toBeOnTheScreen();
  expect(sw).not.toBeChecked();
});

test('reflects the checked state', async () => {
  await render(<ZSwitch checked onChange={jest.fn()} accessibilityLabel="Enable notifications" />);
  expect(screen.getByRole('switch', { name: 'Enable notifications' })).toBeChecked();
});

test('toggling an off switch calls onChange with true', async () => {
  const onChange = jest.fn();
  await render(
    <ZSwitch checked={false} onChange={onChange} accessibilityLabel="Enable notifications" />,
  );
  fireEvent(screen.getByRole('switch', { name: 'Enable notifications' }), 'valueChange', true);
  expect(onChange).toHaveBeenCalledWith(true);
});

test('toggling an on switch calls onChange with false', async () => {
  const onChange = jest.fn();
  await render(<ZSwitch checked onChange={onChange} accessibilityLabel="Enable notifications" />);
  fireEvent(screen.getByRole('switch', { name: 'Enable notifications' }), 'valueChange', false);
  expect(onChange).toHaveBeenCalledWith(false);
});

test('disabled switch reflects the disabled accessibility state', async () => {
  await render(
    <ZSwitch
      checked={false}
      onChange={jest.fn()}
      accessibilityLabel="Enable notifications"
      disabled
    />,
  );
  expect(screen.getByRole('switch', { name: 'Enable notifications' })).toBeDisabled();
});
