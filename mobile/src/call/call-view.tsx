/**
 * Web / Jest stub for the call video view.
 * The real implementation lives in call-view.native.tsx.
 */
import { View, Text } from 'react-native';

export type CallVideoProps = {
  remoteUid: number | null;
  localPreview: boolean;
};

export function CallVideo({ remoteUid: _remoteUid, localPreview: _localPreview }: CallVideoProps) {
  return (
    <View
      testID="call-video-stub"
      style={{ flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' }}
    >
      <Text style={{ color: '#aaa' }}>Video unavailable in this environment</Text>
    </View>
  );
}
