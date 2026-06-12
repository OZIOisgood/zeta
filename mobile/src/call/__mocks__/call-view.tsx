/**
 * Manual jest mock for call-view.
 * Ensures tests always get the web stub (testID="call-video-stub")
 * regardless of jest-expo's .native.tsx resolution order.
 */
import { View } from 'react-native';
import type { CallVideoProps } from '../call-view';

export function CallVideo({ remoteUid: _remoteUid, localPreview: _localPreview }: CallVideoProps) {
  return <View testID="call-video-stub" style={{ flex: 1, backgroundColor: '#000' }} />;
}
