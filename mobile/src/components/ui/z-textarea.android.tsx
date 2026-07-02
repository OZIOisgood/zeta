/**
 * ZTextarea — Android implementation (styled RN TextInput).
 *
 * Rewritten from the @expo/ui Jetpack Compose `OutlinedTextField` to a NativeWind
 * `TextInput`, mirroring z-card.android.tsx's reasoning: the Compose field could
 * not match the UI-kit handoff textarea. It sized to content width instead of
 * full width (`Host matchContents`), exposed no way to set the handoff's 12dp
 * all-around corner radius (M3 fields have fixed small top corners + a bottom
 * indicator), and drew a transparent container rather than the handoff's filled
 * surface — and the Host multiline measurement collapsed the height. A styled RN
 * TextInput gives the exact handoff geometry (full width · rounded-xl · surface
 * fill · 1dp outline) with reliable height control.
 *
 * Tier note: ZTextarea is declared Native, but — exactly like ZCard — the Android
 * surface is drawn with RN where @expo/ui cannot reproduce the required look.
 * iOS keeps its SwiftUI field (z-textarea.ios.tsx); the bare z-textarea.tsx is
 * the identical web/jest fallback.
 *
 * Geometry matches z-textarea.tsx (the handoff field): 56dp min height + 24dp per
 * extra row (M3 outlined-field metric), 12dp radius, surface fill, outline border.
 */

import { useState } from 'react';
import { TextInput } from 'react-native';
import { colors } from '../../theme/colors';
import type { ZTextareaProps } from './z-textarea.types';

export type { ZTextareaProps } from './z-textarea.types';

export function ZTextarea({
  value,
  onChangeText,
  accessibilityLabel,
  placeholder = '',
  rows = 4,
  invalid = false,
  disabled = false,
  testID,
}: ZTextareaProps) {
  // Handoff: 2dp accent focus border (see z-text-input.android.tsx — same
  // border/padding compensation so the text does not shift on focus).
  const [focused, setFocused] = useState(false);
  return (
    <TextInput
      testID={testID}
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={colors.muted}
      editable={!disabled}
      multiline
      numberOfLines={rows}
      textAlignVertical="top"
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={{
        minHeight: 56 + (rows - 1) * 24,
        borderWidth: focused ? 2 : 1,
        paddingHorizontal: focused ? 11 : 12,
        paddingVertical: focused ? 11 : 12,
      }}
      className={`w-full rounded-xl text-[15px] ${
        disabled ? 'bg-surface-variant text-on-surface-variant' : 'bg-background text-on-surface'
      } ${invalid ? 'border-role-danger' : focused ? 'border-accent' : 'border-outline'}`}
    />
  );
}
