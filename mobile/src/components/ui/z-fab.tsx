import { Text, View } from 'react-native';
import { Touchable } from './touchable';
import type { ZFabProps } from './z-fab.types';

export type { ZFabProps } from './z-fab.types';

export function ZFab({ label, icon, onPress, extended = true, className, style, testID }: ZFabProps) {
  return (
    <View className={className} style={style}>
      <Touchable
        testID={testID}
        accessibilityLabel={label}
        onPress={onPress}
        haptic
        className="h-14 flex-row items-center gap-2 self-start rounded-2xl bg-accent px-5 active:opacity-90"
      >
        {icon}
        {extended ? <Text className="text-base font-bold text-on-accent">{label}</Text> : null}
      </Touchable>
    </View>
  );
}
