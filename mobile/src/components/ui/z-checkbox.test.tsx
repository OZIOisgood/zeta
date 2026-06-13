import { render, screen, userEvent } from '@testing-library/react-native';
import { ZCheckbox } from './z-checkbox';

test('renders the label and reports unchecked state', async () => {
  await render(<ZCheckbox value={false} onValueChange={jest.fn()} label="Remember me" />);
  expect(screen.getByRole('checkbox', { name: 'Remember me' })).not.toBeChecked();
});

test('pressing an unchecked box calls onValueChange with true', async () => {
  const user = userEvent.setup();
  const onValueChange = jest.fn();
  await render(<ZCheckbox value={false} onValueChange={onValueChange} label="Remember me" />);
  await user.press(screen.getByRole('checkbox', { name: 'Remember me' }));
  expect(onValueChange).toHaveBeenCalledWith(true);
});

test('pressing a checked box calls onValueChange with false and reflects checked state', async () => {
  const user = userEvent.setup();
  const onValueChange = jest.fn();
  await render(<ZCheckbox value onValueChange={onValueChange} label="Remember me" />);
  const checkbox = screen.getByRole('checkbox', { name: 'Remember me' });
  expect(checkbox).toBeChecked();
  await user.press(checkbox);
  expect(onValueChange).toHaveBeenCalledWith(false);
});

test('disabled checkbox does not call onValueChange', async () => {
  const user = userEvent.setup();
  const onValueChange = jest.fn();
  await render(
    <ZCheckbox value={false} onValueChange={onValueChange} label="Remember me" disabled />,
  );
  await user.press(screen.getByRole('checkbox', { name: 'Remember me' }));
  expect(onValueChange).not.toHaveBeenCalled();
});
