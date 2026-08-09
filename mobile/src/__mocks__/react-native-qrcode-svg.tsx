/**
 * Jest mock for react-native-qrcode-svg.
 *
 * Defined as a module-level file (not inside a jest.mock() factory) so that
 * NativeWind's _ReactNativeCSSInterop Babel transform does not fire and cause
 * the "out-of-scope variable" ReferenceError.
 *
 * The mock renders a plain React Native View with testID="qr-code" and
 * immediately calls getRef (if provided) with a fake SVG ref whose toDataURL
 * invokes the callback with dummy base64 data — enough for share/copy tests.
 */
import React from 'react';
import { View } from 'react-native';

interface QRCodeProps {
  value?: string;
  testID?: string;
  size?: number;
  getRef?: (ref: { toDataURL: (cb: (data: string) => void) => void } | null) => void;
}

function QRCodeSvg({ testID, getRef }: QRCodeProps) {
  // Call getRef synchronously on render so tests can capture the ref without
  // needing useEffect / async timing.
  if (getRef) {
    getRef({ toDataURL: (cb: (data: string) => void) => cb('qrdata') });
  }
  return React.createElement(View, { testID: testID ?? 'qr-code' });
}

export default QRCodeSvg;
