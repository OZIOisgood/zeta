/**
 * Native implementation of the call video view.
 * Uses RtcSurfaceView from react-native-agora (v4).
 * IMPORTANT: This file must never be imported directly in web/jest paths.
 * Only import from 'call-view' (without the .native suffix) — Metro/bundler
 * will resolve to this file on native builds.
 */
import { View } from 'react-native';
import { RtcSurfaceView } from 'react-native-agora';
import type { CallVideoProps } from './call-view';

export { CallVideoProps };

/**
 * Renders remote video full-screen and an optional local preview thumbnail.
 *
 * canvas.uid = 0 is the Agora v4 convention for the local user's video stream.
 * canvas.uid = remoteUid renders the remote participant's stream.
 */
export function CallVideo({ remoteUid, localPreview }: CallVideoProps) {
  return (
    <View testID="call-video-stub" className="flex-1 bg-black">
      {/* Remote video — full bleed */}
      {remoteUid !== null ? (
        <RtcSurfaceView
          canvas={{ uid: remoteUid }}
          style={{ flex: 1 }}
        />
      ) : (
        <View style={{ flex: 1 }} />
      )}

      {/* Local preview — small absolute thumbnail in top-right corner */}
      {localPreview ? (
        <View
          style={{
            position: 'absolute',
            top: 12,
            right: 12,
            width: 100,
            height: 140,
            borderRadius: 8,
            overflow: 'hidden',
          }}
        >
          <RtcSurfaceView
            canvas={{ uid: 0 }}
            style={{ flex: 1 }}
          />
        </View>
      ) : null}
    </View>
  );
}
