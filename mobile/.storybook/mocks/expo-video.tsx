/**
 * Storybook (Vite / react-native-web) mock for `expo-video`.
 *
 * Aliased in `.storybook/main.ts` so stories that import the native video
 * module render in the browser without pulling in Metro-only native code.
 *
 * Mirrors the export surface consumed by the app:
 *   - `VideoView`      → view component (src/app/asset/[id].tsx <Player>)
 *   - `useVideoPlayer` → hook returning a minimal player object whose
 *     `currentTime` setter + `play/pause/replace/release` are no-ops, matching
 *     the access patterns in the asset detail screen (`p.currentTime = …`,
 *     `p.play?.()`).
 */
import { Text, View } from 'react-native';

export type VideoPlayer = {
  currentTime: number;
  playing: boolean;
  play: () => void;
  pause: () => void;
  replace: (source: unknown) => void;
  release: () => void;
};

export function VideoView(_props: {
  player?: VideoPlayer;
  style?: unknown;
  fullscreenOptions?: { enable?: boolean };
  [key: string]: unknown;
}) {
  return (
    <View className="aspect-video w-full items-center justify-center rounded-lg bg-z-surface-muted">
      <Text className="text-z-muted">VideoView mock</Text>
    </View>
  );
}

export function useVideoPlayer(
  _source?: unknown,
  _setup?: (player: VideoPlayer) => void,
): VideoPlayer {
  return {
    currentTime: 0,
    playing: false,
    play: () => {},
    pause: () => {},
    replace: () => {},
    release: () => {},
  };
}
