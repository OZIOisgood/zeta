import { Text, View } from 'react-native';
import { Touchable } from './touchable';
import type { ZFabProps } from './z-fab.types';

export type { ZFabProps } from './z-fab.types';

export function ZFab({
  label,
  icon,
  onPress,
  extended = true,
  tone = 'primary',
  className,
  style,
  testID,
}: ZFabProps) {
  const surfaceTone = tone === 'primary' ? 'bg-accent' : 'bg-accent-container';
  const labelTone = tone === 'primary' ? 'text-on-accent' : 'text-on-accent-container';
  // Extended → 56dp-tall pill that hugs its content (icon + label) with side
  // padding. Collapsed → 56dp square (no horizontal padding) with the centered
  // glyph, matching the M3 medium FAB. Both `self-start` so the FAB hugs its
  // content and never stretches to its parent's width.
  //
  // This NativeWind pill is the impl on ALL platforms that render a FAB (Android
  // + web/Storybook/jest); iOS renders null (z-fab.ios.tsx). It deliberately does
  // NOT use the @expo/ui Compose FAB: that one lived in a `Host` which re-reports
  // full width on a tab-switch re-layout (the FAB grew to the screen edge). Yoga
  // sizes this pill deterministically, so it can't stretch. Native Android ripple
  // comes from Touchable; `elevation: 6` gives the M3 resting float.
  const shapeTone = extended ? 'flex-row items-center gap-2 px-5' : 'w-14 justify-center';
  return (
    <View className={className} style={style}>
      <Touchable
        testID={testID}
        accessibilityLabel={label}
        onPress={onPress}
        haptic
        style={{ elevation: 6 }}
        className={`h-14 items-center self-start rounded-[16px] ${surfaceTone} ${shapeTone} active:opacity-90`}
      >
        {icon}
        {extended ? <Text className={`text-base font-semibold ${labelTone}`}>{label}</Text> : null}
      </Touchable>
    </View>
  );
}
