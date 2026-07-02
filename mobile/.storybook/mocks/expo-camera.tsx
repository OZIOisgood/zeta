/**
 * Storybook (Vite / react-native-web) mock for `expo-camera`.
 *
 * Aliased in `.storybook/main.ts` so stories that import the camera module
 * render in the browser without the native camera dependency.
 *
 * Mirrors the export surface consumed by the app:
 *   - `CameraView`              → view component (src/app/invite.tsx QR scanner)
 *   - `useCameraPermissions`    → permission hook (invite + call screens)
 *   - `useMicrophonePermissions`→ permission hook (call screen)
 *
 * The permission hooks return a granted permission and a no-op async requester,
 * matching the `[permission, requestPermission]` tuple shape.
 */
import { Text, View } from 'react-native';

export type PermissionResponse = {
  status: 'granted';
  granted: true;
  canAskAgain: true;
  expires: 'never';
};

const grantedPermission: PermissionResponse = {
  status: 'granted',
  granted: true,
  canAskAgain: true,
  expires: 'never',
};

type RequestPermission = () => Promise<PermissionResponse>;

const requestPermission: RequestPermission = async () => grantedPermission;

export function CameraView(_props: {
  style?: unknown;
  barcodeScannerSettings?: { barcodeTypes?: string[] };
  onBarcodeScanned?: (event: { data: string }) => void;
  [key: string]: unknown;
}) {
  return (
    <View className="aspect-video w-full items-center justify-center rounded-lg bg-z-surface-muted">
      <Text className="text-z-muted">CameraView mock</Text>
    </View>
  );
}

export function useCameraPermissions(): [PermissionResponse, RequestPermission] {
  return [grantedPermission, requestPermission];
}

export function useMicrophonePermissions(): [PermissionResponse, RequestPermission] {
  return [grantedPermission, requestPermission];
}
