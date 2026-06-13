import { SafeAreaProvider } from 'react-native-safe-area-context';
import { act, render, screen, userEvent } from '@testing-library/react-native';

jest.mock('expo-localization', () => ({ getLocales: () => [{ languageCode: 'en' }] }));

import { initI18n } from '../../i18n';
import { ZToastHost, showToast, toastStore } from './z-toast';

beforeAll(() => initI18n('en'));

const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 59, left: 0, right: 0, bottom: 34 },
};

function renderHost() {
  return render(
    <SafeAreaProvider initialMetrics={metrics}>
      <ZToastHost />
    </SafeAreaProvider>,
  );
}

beforeEach(() => {
  // Reset before any component is mounted, so this is a plain store mutation.
  toastStore.setState({ toasts: [] });
});

test('show renders the toast title and message', async () => {
  await renderHost();
  await act(async () => {
    showToast('Saved', 'Your changes are live');
  });
  expect(screen.getByText('Saved')).toBeOnTheScreen();
  expect(screen.getByText('Your changes are live')).toBeOnTheScreen();
});

test('show renders a toast without a message', async () => {
  await renderHost();
  await act(async () => {
    showToast('Uploaded');
  });
  expect(screen.getByText('Uploaded')).toBeOnTheScreen();
});

test('show returns distinct ids for each toast', async () => {
  await renderHost();
  let first = 0;
  let second = 0;
  await act(async () => {
    first = showToast('One');
    second = showToast('Two');
  });
  expect(first).not.toBe(second);
  expect(screen.getByText('One')).toBeOnTheScreen();
  expect(screen.getByText('Two')).toBeOnTheScreen();
});

test('pressing dismiss removes the toast', async () => {
  const user = userEvent.setup();
  await renderHost();
  await act(async () => {
    showToast('Saved', 'Your changes are live');
  });
  await user.press(screen.getByRole('button', { name: 'Dismiss' }));
  expect(screen.queryByText('Saved')).toBeNull();
});

test('the toast auto-dismisses after the timeout', async () => {
  jest.useFakeTimers();
  try {
    await renderHost();
    await act(async () => {
      showToast('Saved');
    });
    expect(screen.getByText('Saved')).toBeOnTheScreen();
    await act(async () => {
      jest.advanceTimersByTime(3000);
    });
    expect(screen.queryByText('Saved')).toBeNull();
  } finally {
    jest.useRealTimers();
  }
});
