/**
 * ZSeekChip — shared NativeWind implementation (web / iOS / Android / jest).
 *
 * This is the ONLY implementation file for ZSeekChip — there are no .ios.tsx
 * or .android.tsx variants. See z-seek-chip.types.ts for the rationale (no
 * native widget maps to an accent navigational timecode pill).
 *
 * The comment's video-timecode is the primary "seek" affordance on a review
 * row: an accent-container pill with a leading play glyph (▶ 0:12), tabular
 * figures, tappable to seek. Press feedback / haptics / the button a11y role
 * come from the shared `Touchable` infra primitive.
 *
 * Colors come exclusively from role tokens: the accent-container fill via the
 * NativeWind class `bg-accent-container` / label `text-on-accent-container`,
 * and the play glyph via the `onAccentContainer` role color from
 * theme/native.ts. No raw hex values.
 *
 * Tier: Custom RN (shared) — small presentational/navigational pill with no
 * native interactive equivalent.
 */

import { Text } from 'react-native';

import { useRoleColors } from '../../theme/native';
import { Touchable } from './touchable';
import { ZSymbol } from './z-symbol';
import type { ZSeekChipProps } from './z-seek-chip.types';

export type { ZSeekChipProps } from './z-seek-chip.types';

export function ZSeekChip({ label, onPress, accessibilityLabel, testID }: ZSeekChipProps) {
  const { color } = useRoleColors();
  return (
    <Touchable
      testID={testID}
      accessibilityLabel={accessibilityLabel ?? label}
      onPress={onPress}
      // The pill is only 24px tall (h-6) to read as a quiet inline chip; hitSlop
      // lifts the effective touch target toward the ~44pt HIG / 48dp Material
      // minimum without growing the visual height.
      pressableProps={{ hitSlop: { top: 10, bottom: 10, left: 4, right: 4 } }}
      // Optical alignment, matched to the handoff: asymmetric padding (tighter on
      // the leading play glyph, looser after the timecode) and a 11px glyph that
      // sits on the 12.5px tabular-nums label baseline.
      className="h-6 flex-row items-center gap-1 rounded-full bg-accent-container pl-[7px] pr-[9px]"
    >
      <ZSymbol name="play" label="" size={11} color={color('onAccentContainer')} />
      <Text
        className="text-[12.5px] font-bold text-on-accent-container"
        style={{ fontVariant: ['tabular-nums'] }}
      >
        {label}
      </Text>
    </Touchable>
  );
}
