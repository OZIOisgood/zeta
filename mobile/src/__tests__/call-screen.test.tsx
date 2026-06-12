/**
 * Tests for the /call/[bookingId] screen.
 * Tests run in the default (web/jest) environment, so CallVideo renders
 * the stub (testID="call-video-stub").
 */
import { render, screen, fireEvent, act } from '@testing-library/react-native';


// ── native module mocks ───────────────────────────────────────────────────────

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => undefined),
  deleteItemAsync: jest.fn(async () => undefined),
}));

jest.mock('expo-localization', () => ({ getLocales: () => [{ languageCode: 'en' }] }));

// ── permission mocks ──────────────────────────────────────────────────────────

let mockCameraStatus = 'granted';
let mockMicStatus = 'granted';
const mockRequestCamera = jest.fn(async () => ({ status: 'granted', granted: true }));
const mockRequestMic = jest.fn(async () => ({ status: 'granted', granted: true }));

jest.mock('expo-camera', () => ({
  useCameraPermissions: () => [
    { status: mockCameraStatus, granted: mockCameraStatus === 'granted' },
    mockRequestCamera,
  ],
  useMicrophonePermissions: () => [
    { status: mockMicStatus, granted: mockMicStatus === 'granted' },
    mockRequestMic,
  ],
}));

// ── call store mock ───────────────────────────────────────────────────────────

const mockJoin = jest.fn(async () => undefined);
const mockLeave = jest.fn(async () => undefined);
const mockToggleMic = jest.fn();
const mockToggleCamera = jest.fn();
const mockSwitchCamera = jest.fn();

// Mutable state controlled per-test
let mockPhase: 'idle' | 'connecting' | 'inCall' | 'error' = 'connecting';
let mockRemoteUid: number | null = null;
let mockMicMuted = false;
let mockCameraEnabled = true;

jest.mock('../call/call-store', () => ({
  callStore: {
    getState: jest.fn(() => ({
      join: mockJoin,
      leave: mockLeave,
      toggleMic: mockToggleMic,
      toggleCamera: mockToggleCamera,
      switchCamera: mockSwitchCamera,
    })),
  },
  useCall: (selector: (s: {
    phase: string;
    remoteUid: number | null;
    micMuted: boolean;
    cameraEnabled: boolean;
    error: string | null;
  }) => unknown) =>
    selector({
      phase: mockPhase,
      remoteUid: mockRemoteUid,
      micMuted: mockMicMuted,
      cameraEnabled: mockCameraEnabled,
      error: mockPhase === 'error' ? 'A call error occurred' : null,
    }),
}));

// ── router mock ───────────────────────────────────────────────────────────────

const mockBack = jest.fn();
jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ bookingId: 'b1', groupId: 'g1' }),
  useRouter: () => ({ back: mockBack }),
}));

// ── i18n + component imports ──────────────────────────────────────────────────

import { initI18n } from '../i18n';
import CallScreen from '../app/call/[bookingId]';

beforeAll(() => initI18n('en'));

beforeEach(() => {
  jest.clearAllMocks();
  mockCameraStatus = 'granted';
  mockMicStatus = 'granted';
  mockPhase = 'connecting';
  mockRemoteUid = null;
  mockMicMuted = false;
  mockCameraEnabled = true;
});

// ── Test 1: permissions granted + phase connecting ────────────────────────────

test('permissions granted + phase connecting → skeleton state and join called once', async () => {
  mockPhase = 'connecting';
  await act(async () => {
    render(<CallScreen />);
  });
  expect(screen.getByTestId('call-connecting')).toBeOnTheScreen();
  expect(mockJoin).toHaveBeenCalledTimes(1);
  expect(mockJoin).toHaveBeenCalledWith('g1', 'b1');
});

// ── Test 2: phase inCall with remoteUid → CallVideo + controls ────────────────

test('phase inCall with remoteUid → CallVideo stub and control buttons present', async () => {
  mockPhase = 'inCall';
  mockRemoteUid = 42;
  await act(async () => {
    render(<CallScreen />);
  });
  expect(screen.getByTestId('call-video-stub')).toBeOnTheScreen();
  expect(screen.getByTestId('call-mic')).toBeOnTheScreen();
  expect(screen.getByTestId('call-camera')).toBeOnTheScreen();
  expect(screen.getByTestId('call-switch')).toBeOnTheScreen();
  expect(screen.getByTestId('call-leave')).toBeOnTheScreen();
});

// ── Test 3: phase inCall, remoteUid null → waiting hint ───────────────────────

test('phase inCall remoteUid null → waiting hint visible', async () => {
  mockPhase = 'inCall';
  mockRemoteUid = null;
  await act(async () => {
    render(<CallScreen />);
  });
  expect(screen.getByTestId('call-waiting')).toBeOnTheScreen();
});

// ── Test 4: leave button → leave called exactly ONCE total (including unmount) ─

test('press call-leave then unmount → leave called exactly once, router.back called once', async () => {
  mockPhase = 'inCall';
  mockRemoteUid = 42;
  // render is async in @testing-library/react-native v14
  const view = await render(<CallScreen />);
  await act(async () => {
    fireEvent.press(screen.getByTestId('call-leave'));
  });
  // Simulate the unmount that router.back() triggers (back-navigate triggers unmount)
  await act(async () => {
    view.unmount();
  });
  // leave() must fire exactly once — the unmount cleanup is the single teardown path
  expect(mockLeave).toHaveBeenCalledTimes(1);
  expect(mockBack).toHaveBeenCalledTimes(1);
});

// ── Test 5: camera permission denied → permission-denied state ────────────────

test('camera permission denied → call-permission-denied state, join NOT called', async () => {
  mockCameraStatus = 'denied';
  await act(async () => {
    render(<CallScreen />);
  });
  expect(screen.getByTestId('call-permission-denied')).toBeOnTheScreen();
  expect(mockJoin).not.toHaveBeenCalled();
});

// ── Test 6: phase error → error text + back affordance ───────────────────────

test('phase error → error message visible with back button', async () => {
  mockPhase = 'error';
  await act(async () => {
    render(<CallScreen />);
  });
  expect(screen.getByText('A call error occurred')).toBeOnTheScreen();
  expect(screen.getByTestId('call-back')).toBeOnTheScreen();
});
