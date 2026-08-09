import { render, screen, userEvent } from '@testing-library/react-native';
import { ZSelect } from './z-select';

const options = [
  { value: 'a', label: 'Alpha' },
  { value: 'b', label: 'Beta' },
];

test('shows the placeholder when no value is selected', async () => {
  await render(
    <ZSelect
      options={options}
      placeholder="Pick one"
      onValueChange={jest.fn()}
      accessibilityLabel="Group"
    />,
  );
  expect(screen.getByText('Pick one')).toBeOnTheScreen();
});

test('shows the selected option label when value is set', async () => {
  await render(
    <ZSelect
      value="b"
      options={options}
      placeholder="Pick one"
      onValueChange={jest.fn()}
      accessibilityLabel="Group"
    />,
  );
  expect(screen.getByText('Beta')).toBeOnTheScreen();
  expect(screen.queryByText('Pick one')).not.toBeOnTheScreen();
});

test('opening the modal and tapping an option calls onValueChange', async () => {
  const user = userEvent.setup();
  const onValueChange = jest.fn();
  await render(
    <ZSelect options={options} onValueChange={onValueChange} accessibilityLabel="Group" />,
  );
  await user.press(screen.getByRole('button', { name: 'Group' }));
  await user.press(screen.getByRole('button', { name: 'Beta' }));
  expect(onValueChange).toHaveBeenCalledWith('b');
});

test('disabled trigger does not open the modal', async () => {
  const user = userEvent.setup();
  const onValueChange = jest.fn();
  await render(
    <ZSelect
      options={options}
      onValueChange={onValueChange}
      accessibilityLabel="Group"
      disabled
    />,
  );
  await user.press(screen.getByRole('button', { name: 'Group' }));
  expect(screen.queryByRole('button', { name: 'Beta' })).not.toBeOnTheScreen();
  expect(onValueChange).not.toHaveBeenCalled();
});
