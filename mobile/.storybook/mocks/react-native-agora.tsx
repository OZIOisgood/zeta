/**
 * Storybook (Vite / react-native-web) mock for `react-native-agora`.
 *
 * Aliased in `.storybook/main.ts` so the alias resolves even though the live
 * call surface only renders through `call-view.native.tsx` on device — this
 * mock keeps the Vite graph green if any story transitively touches the module.
 *
 * Mirrors the runtime export surface consumed by the native call code:
 *   - `RtcSurfaceView` / `RtcTextureView` → view components (call-view.native)
 *   - `createAgoraRtcEngine`              → engine factory (call-engine.native)
 *   - `ChannelProfileType` / `ClientRoleType` → enum constants
 *
 * The engine factory returns a no-op stub; the surface/texture views render a
 * lightweight placeholder. Type-only exports (IRtcEngine, …) are erased and
 * need no runtime counterpart.
 */
import { Text, View } from 'react-native';

export const ChannelProfileType = {
  ChannelProfileCommunication: 0,
  ChannelProfileLiveBroadcasting: 1,
} as const;

export const ClientRoleType = {
  ClientRoleBroadcaster: 1,
  ClientRoleAudience: 2,
} as const;

export function RtcSurfaceView(_props: {
  canvas?: { uid: number };
  style?: unknown;
  [key: string]: unknown;
}) {
  return (
    <View className="aspect-video w-full items-center justify-center rounded-lg bg-z-surface-muted">
      <Text className="text-z-muted">RtcSurfaceView mock</Text>
    </View>
  );
}

export function RtcTextureView(_props: {
  canvas?: { uid: number };
  style?: unknown;
  [key: string]: unknown;
}) {
  return (
    <View className="aspect-video w-full items-center justify-center rounded-lg bg-z-surface-muted">
      <Text className="text-z-muted">RtcTextureView mock</Text>
    </View>
  );
}

export function createAgoraRtcEngine() {
  return {
    initialize: () => {},
    registerEventHandler: () => {},
    unregisterEventHandler: () => {},
    enableVideo: () => {},
    startPreview: () => {},
    joinChannel: () => {},
    leaveChannel: () => {},
    muteLocalAudioStream: () => {},
    enableLocalVideo: () => {},
    switchCamera: () => {},
    release: () => {},
  };
}
