import { render, screen, userEvent } from '@testing-library/react-native';

const mockLaunch = jest.fn();
jest.mock('expo-image-picker', () => ({
  launchImageLibraryAsync: (...args: unknown[]) => mockLaunch(...args),
}));

import { ZAvatarInput } from './z-avatar-input';

beforeEach(() => jest.clearAllMocks());

test('renders the fallback initials when no value is provided', async () => {
  await render(<ZAvatarInput label="Select image" fallback="HM" onChange={jest.fn()} />);
  expect(screen.getByText('HM')).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: 'Select image' })).toBeOnTheScreen();
});

test('calls onChange with the picked base64 payload', async () => {
  const user = userEvent.setup();
  const onChange = jest.fn();
  mockLaunch.mockResolvedValue({
    canceled: false,
    assets: [{ base64: 'abc123' }],
  });

  await render(<ZAvatarInput label="Select image" onChange={onChange} />);
  await user.press(screen.getByRole('button', { name: 'Select image' }));

  expect(onChange).toHaveBeenCalledWith('abc123');
});

test('does not call onChange when the picker is canceled', async () => {
  const user = userEvent.setup();
  const onChange = jest.fn();
  mockLaunch.mockResolvedValue({ canceled: true, assets: [] });

  await render(<ZAvatarInput label="Select image" onChange={onChange} />);
  await user.press(screen.getByRole('button', { name: 'Select image' }));

  expect(onChange).not.toHaveBeenCalled();
});
