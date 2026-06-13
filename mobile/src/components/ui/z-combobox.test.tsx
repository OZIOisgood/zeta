import { render, screen, userEvent } from '@testing-library/react-native';
import { ZCombobox } from './z-combobox';

const options = [
  { value: 'en', label: 'English' },
  { value: 'de', label: 'German' },
  { value: 'fr', label: 'French' },
];

test('shows the placeholder when no value is selected', async () => {
  await render(
    <ZCombobox
      options={options}
      placeholder="Pick a language"
      onValueChange={jest.fn()}
      accessibilityLabel="Language"
    />,
  );
  expect(screen.getByText('Pick a language')).toBeOnTheScreen();
});

test('shows the selected option label when value is set', async () => {
  await render(
    <ZCombobox
      value="de"
      options={options}
      placeholder="Pick a language"
      onValueChange={jest.fn()}
      accessibilityLabel="Language"
    />,
  );
  expect(screen.getByText('German')).toBeOnTheScreen();
  expect(screen.queryByText('Pick a language')).not.toBeOnTheScreen();
});

test('filters options by the search field, case-insensitively', async () => {
  const user = userEvent.setup();
  await render(
    <ZCombobox
      options={options}
      onValueChange={jest.fn()}
      accessibilityLabel="Language"
      searchPlaceholder="Search languages"
    />,
  );
  await user.press(screen.getByRole('button', { name: 'Language' }));
  await user.type(screen.getByLabelText('Search languages'), 'fr');
  expect(screen.getByRole('button', { name: 'French' })).toBeOnTheScreen();
  expect(screen.queryByRole('button', { name: 'English' })).not.toBeOnTheScreen();
  expect(screen.queryByRole('button', { name: 'German' })).not.toBeOnTheScreen();
});

test('selecting a filtered option calls onValueChange', async () => {
  const user = userEvent.setup();
  const onValueChange = jest.fn();
  await render(
    <ZCombobox
      options={options}
      onValueChange={onValueChange}
      accessibilityLabel="Language"
      searchPlaceholder="Search languages"
    />,
  );
  await user.press(screen.getByRole('button', { name: 'Language' }));
  await user.type(screen.getByLabelText('Search languages'), 'german');
  await user.press(screen.getByRole('button', { name: 'German' }));
  expect(onValueChange).toHaveBeenCalledWith('de');
});

test('renders all options in the scrollable list when opened', async () => {
  const user = userEvent.setup();
  await render(
    <ZCombobox
      options={options}
      onValueChange={jest.fn()}
      accessibilityLabel="Language"
      searchPlaceholder="Search languages"
    />,
  );
  await user.press(screen.getByRole('button', { name: 'Language' }));
  expect(screen.getByRole('button', { name: 'English' })).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: 'German' })).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: 'French' })).toBeOnTheScreen();
});

test('uses the closeLabel prop for the backdrop accessibility label', async () => {
  const user = userEvent.setup();
  const onValueChange = jest.fn();
  await render(
    <ZCombobox
      options={options}
      onValueChange={onValueChange}
      accessibilityLabel="Language"
      closeLabel="Schließen"
    />,
  );
  await user.press(screen.getByRole('button', { name: 'Language' }));
  expect(screen.getByLabelText('Schließen')).toBeOnTheScreen();
});

test('disabled trigger does not open the modal', async () => {
  const user = userEvent.setup();
  const onValueChange = jest.fn();
  await render(
    <ZCombobox
      options={options}
      onValueChange={onValueChange}
      accessibilityLabel="Language"
      searchPlaceholder="Search languages"
      disabled
    />,
  );
  await user.press(screen.getByRole('button', { name: 'Language' }));
  expect(screen.queryByLabelText('Search languages')).not.toBeOnTheScreen();
  expect(onValueChange).not.toHaveBeenCalled();
});
