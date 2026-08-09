/**
 * Jest mock for ZAvatarInput (src/components/ui/z-avatar-input).
 *
 * Defined as a module-level file to avoid NativeWind's _ReactNativeCSSInterop
 * transform firing inside a jest.mock() factory (which would produce an
 * "out-of-scope variable" ReferenceError).
 *
 * Pressing the mock element fires onChange with 'base64data', simulating a
 * successful image pick without triggering native picker UI.
 */
import React from 'react';
import { Pressable } from 'react-native';

interface ZAvatarInputProps {
  testID?: string;
  value?: string;
  onChange: (b64: string) => void;
  label?: string;
  disabled?: boolean;
}

export function ZAvatarInput({ testID, onChange, disabled }: ZAvatarInputProps) {
  return React.createElement(Pressable, {
    testID,
    accessibilityRole: 'button',
    disabled,
    onPress: () => onChange('base64data'),
  });
}
