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
  return (
    <View className={className} style={style}>
      <Touchable
        testID={testID}
        accessibilityLabel={label}
        onPress={onPress}
        haptic
        className={`h-14 flex-row items-center gap-2 self-start rounded-[16px] ${surfaceTone} px-5 active:opacity-90`}
      >
        {icon}
        {extended ? <Text className={`text-base font-semibold ${labelTone}`}>{label}</Text> : null}
      </Touchable>
    </View>
  );
}
