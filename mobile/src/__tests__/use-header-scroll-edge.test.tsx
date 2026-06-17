/**
 * Tests for useHeaderScrollEdge (src/lib/use-header-scroll-edge.ts).
 *
 * The hook drives the Material-3 scroll-edge top-app-bar effect on Android by
 * toggling `headerShadowVisible` from the list scroll position (flat at rest,
 * elevated once content scrolls under the bar). On iOS the native large-title
 * header owns the hairline, so the hook is a no-op there.
 *
 * Platform is mocked per-test so both branches are covered (jest-expo defaults
 * Platform.OS to 'ios').
 */
import React, { useEffect } from 'react';
import { Platform, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { render } from '@testing-library/react-native';

const mockSetOptions = jest.fn();
jest.mock('expo-router', () => ({
  useNavigation: () => ({ setOptions: mockSetOptions }),
}));

import { useHeaderScrollEdge } from '../lib/use-header-scroll-edge';

// Capture the handler the hook returns so a test can fire synthetic scroll
// events at it after render. Written from an effect (not during render) to
// satisfy the react-compiler purity rule.
let captured: ((e: NativeSyntheticEvent<NativeScrollEvent>) => void) | null = null;
function Harness() {
  const onScroll = useHeaderScrollEdge();
  useEffect(() => {
    captured = onScroll;
  }, [onScroll]);
  return null;
}

function scrollEvent(y: number): NativeSyntheticEvent<NativeScrollEvent> {
  return {
    nativeEvent: { contentOffset: { x: 0, y } },
  } as NativeSyntheticEvent<NativeScrollEvent>;
}

const originalOS = Platform.OS;
afterEach(() => {
  mockSetOptions.mockClear();
  captured = null;
  Object.defineProperty(Platform, 'OS', { configurable: true, value: originalOS });
});

function setOS(os: 'ios' | 'android') {
  Object.defineProperty(Platform, 'OS', { configurable: true, value: os });
}

describe('iOS', () => {
  test('returns a handler but never calls setOptions (native scroll-edge owns the hairline)', async () => {
    setOS('ios');
    await render(<Harness />);
    expect(typeof captured).toBe('function');
    expect(mockSetOptions).not.toHaveBeenCalled();

    captured?.(scrollEvent(0));
    captured?.(scrollEvent(120));
    expect(mockSetOptions).not.toHaveBeenCalled();
  });
});

describe('Android', () => {
  test('sets headerShadowVisible:false on mount (flat at rest)', async () => {
    setOS('android');
    await render(<Harness />);
    expect(mockSetOptions).toHaveBeenCalledWith({ headerShadowVisible: false });
  });

  test('elevates (headerShadowVisible:true) once content scrolls under the bar', async () => {
    setOS('android');
    await render(<Harness />);
    mockSetOptions.mockClear();

    captured?.(scrollEvent(40));
    expect(mockSetOptions).toHaveBeenCalledWith({ headerShadowVisible: true });
  });

  test('returns to flat (headerShadowVisible:false) when scrolled back to the top', async () => {
    setOS('android');
    await render(<Harness />);

    captured?.(scrollEvent(40)); // elevate
    mockSetOptions.mockClear();
    captured?.(scrollEvent(0)); // back to rest
    expect(mockSetOptions).toHaveBeenCalledWith({ headerShadowVisible: false });
  });

  test('does not call setOptions on every frame while staying on the same side', async () => {
    setOS('android');
    await render(<Harness />);
    mockSetOptions.mockClear();

    captured?.(scrollEvent(40)); // crosses → one call
    captured?.(scrollEvent(80)); // still elevated → no call
    captured?.(scrollEvent(200)); // still elevated → no call
    expect(mockSetOptions).toHaveBeenCalledTimes(1);
  });
});
