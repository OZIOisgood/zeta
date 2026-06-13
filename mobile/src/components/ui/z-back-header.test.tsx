import { render, screen, userEvent } from '@testing-library/react-native';
import { Text } from 'react-native';
import { initI18n } from '../../i18n';

const mockBack = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ back: mockBack }) }));

import { ZBackHeader } from './z-back-header';

beforeAll(async () => {
  await initI18n('en');
});

beforeEach(() => {
  mockBack.mockClear();
});

test('renders the title', async () => {
  await render(<ZBackHeader title="Reports" />);
  expect(screen.getByText('Reports')).toBeOnTheScreen();
});

test('renders the subtitle when provided', async () => {
  await render(<ZBackHeader title="Reports" subtitle="Flagged content review." />);
  expect(screen.getByText('Flagged content review.')).toBeOnTheScreen();
});

test('omits the subtitle when not provided', async () => {
  await render(<ZBackHeader title="Reports" testID="hdr" />);
  expect(screen.getByTestId('hdr')).toBeOnTheScreen();
  expect(screen.queryByText('Flagged content review.')).toBeNull();
});

test('back button is labelled with the localized back action', async () => {
  await render(<ZBackHeader title="Reports" />);
  expect(screen.getByRole('button', { name: 'Back' })).toBeOnTheScreen();
});

test('default onBack calls router.back()', async () => {
  const user = userEvent.setup();
  await render(<ZBackHeader title="Reports" />);
  await user.press(screen.getByRole('button', { name: 'Back' }));
  expect(mockBack).toHaveBeenCalledTimes(1);
});

test('custom onBack overrides router.back()', async () => {
  const user = userEvent.setup();
  const onBack = jest.fn();
  await render(<ZBackHeader title="Reports" onBack={onBack} />);
  await user.press(screen.getByRole('button', { name: 'Back' }));
  expect(onBack).toHaveBeenCalledTimes(1);
  expect(mockBack).not.toHaveBeenCalled();
});

test('renders the trailing action slot', async () => {
  await render(<ZBackHeader title="Reports" action={<Text>filter</Text>} />);
  expect(screen.getByText('filter')).toBeOnTheScreen();
});
