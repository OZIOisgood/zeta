/**
 * ZTextInput — Android implementation (styled RN TextInput).
 *
 * Rewritten from the @expo/ui Compose `OutlinedTextField` to a NativeWind
 * `TextInput`, mirroring z-textarea.android.tsx + z-card.android.tsx. The Compose
 * field could not match the UI-kit handoff input: it floated the placeholder as
 * an M3 label (redundant — screens already render a `ZFieldLabel` ABOVE each
 * field), sized to content width, and drew a transparent outlined box rather
 * than the handoff's filled rounded box. A styled RN TextInput gives the exact
 * handoff geometry (full width · rounded-xl · surface fill · 1dp outline),
 * label-above (not floating), and — unlike Compose — forwards accessibilityLabel
 * to TalkBack.
 *
 * Tier note: ZTextInput is declared Native, but — like ZCard/ZTextarea — the
 * Android surface is drawn with RN where @expo/ui cannot reproduce the look.
 * iOS keeps its SwiftUI field; the bare z-text-input.tsx is the identical
 * web/jest fallback. Geometry matches z-textarea.android.tsx for a consistent
 * filled-input look across single- and multi-line fields.
 */

import { useState } from 'react';
import { TextInput } from 'react-native';
import { colors } from '../../theme/colors';
import type { ZTextInputProps } from './z-text-input.types';

export type { ZTextInputProps } from './z-text-input.types';

export function ZTextInput({
  value,
  onChangeText,
  accessibilityLabel,
  placeholder = '',
  invalid = false,
  disabled = false,
  testID,
  autoCapitalize,
  autoCorrect,
  returnKeyType,
  onSubmitEditing,
}: ZTextInputProps) {
  // Handoff: the outlined field turns 2dp accent on focus (the bare fallback
  // does it via focus: classes, which NativeWind does not apply to native
  // TextInput). RN has no inset ring, so the border widens 1→2dp and the
  // padding gives the extra dp back — no layout shift. `invalid` keeps the
  // danger color even while focused (M3 error precedence).
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
      autoCapitalize={autoCapitalize}
      autoCorrect={autoCorrect}
      returnKeyType={returnKeyType}
      onSubmitEditing={onSubmitEditing}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      // 56dp: handoff M3 outlined-field height (bare + textarea already use it).
      style={{
        minHeight: 56,
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
