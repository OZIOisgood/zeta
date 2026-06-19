import { Text, View } from 'react-native';
import { Touchable } from './touchable';
import type { ZTimeGridProps } from './z-time-grid.types';

export type { ZTimeGridProps, ZTimeGridSlot } from './z-time-grid.types';

/**
 * 3-column grid of start-time cells. Selected = accent fill / on-accent text;
 * unselected = surface-1 / on-surface with a 1px outline inset. Radius 12.
 */
export function ZTimeGrid({
  slots,
  selectedStartsAt,
  onSelect,
  hint,
  className,
  style,
  testID,
}: ZTimeGridProps) {
  return (
    <View className={className} style={style} testID={testID}>
      <View className="flex-row flex-wrap" style={{ marginHorizontal: -4 }}>
        {slots.map((s) => {
          const selected = s.startsAt === selectedStartsAt;
          return (
            <View key={s.startsAt} style={{ width: '33.333%', padding: 4 }}>
              <Touchable
                testID={testID ? `${testID}-${s.startsAt}` : undefined}
                accessibilityLabel={s.label}
                selected={selected}
                onPress={() => onSelect(s.startsAt)}
                className={`min-h-[44px] items-center justify-center rounded-xl ${
                  selected ? 'bg-accent' : 'border border-outline bg-surface-1'
                }`}
              >
                <Text
                  className={`text-[15px] font-bold ${
                    selected ? 'text-on-accent' : 'text-on-surface'
                  }`}
                >
                  {s.label}
                </Text>
              </Touchable>
            </View>
          );
        })}
      </View>
      {hint ? <Text className="mt-3 text-xs text-on-surface-variant">{hint}</Text> : null}
    </View>
  );
}
