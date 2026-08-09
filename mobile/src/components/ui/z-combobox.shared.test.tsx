/**
 * Unit tests for the selectStore (z-combobox.shared).
 *
 * These tests exercise the vanilla Zustand store that bridges the ZCombobox
 * trigger (Custom-RN iOS/Android) with the pushed /select/[field] screen.
 */

import { selectStore, openSelect, useSelectRequest } from './z-combobox.shared';
import type { SelectRequest } from './z-combobox.shared';
import { renderHook, act } from '@testing-library/react-native';

const DUMMY_REQUEST: SelectRequest = {
  fieldKey: 'language',
  options: [
    { value: 'en', label: 'English' },
    { value: 'de', label: 'Deutsch' },
  ],
  value: 'en',
  onSelect: jest.fn(),
  title: 'Language',
  searchPlaceholder: 'Search languages',
};

beforeEach(() => {
  // Reset to a clean slate before each test
  selectStore.getState().clear();
});

test('selectStore starts with request = null', () => {
  expect(selectStore.getState().request).toBeNull();
});

test('openSelect(req) sets the request in the store', () => {
  openSelect(DUMMY_REQUEST);
  expect(selectStore.getState().request).toEqual(DUMMY_REQUEST);
});

test('clear() resets request to null', () => {
  openSelect(DUMMY_REQUEST);
  selectStore.getState().clear();
  expect(selectStore.getState().request).toBeNull();
});

test('openSelect replaces an existing request', () => {
  const first: SelectRequest = { ...DUMMY_REQUEST, fieldKey: 'timezone', title: 'Timezone' };
  const second: SelectRequest = { ...DUMMY_REQUEST, fieldKey: 'language', title: 'Language' };

  openSelect(first);
  expect(selectStore.getState().request?.fieldKey).toBe('timezone');

  openSelect(second);
  expect(selectStore.getState().request?.fieldKey).toBe('language');
});

test('useSelectRequest hook returns null initially', async () => {
  const { result } = await renderHook(() => useSelectRequest());
  expect(result.current).toBeNull();
});

test('useSelectRequest hook reflects openSelect', async () => {
  const { result } = await renderHook(() => useSelectRequest());

  await act(async () => {
    openSelect(DUMMY_REQUEST);
  });

  expect(result.current).toEqual(DUMMY_REQUEST);
});

test('useSelectRequest hook reflects clear()', async () => {
  const { result } = await renderHook(() => useSelectRequest());

  await act(async () => {
    openSelect(DUMMY_REQUEST);
  });
  expect(result.current).not.toBeNull();

  await act(async () => {
    selectStore.getState().clear();
  });
  expect(result.current).toBeNull();
});
