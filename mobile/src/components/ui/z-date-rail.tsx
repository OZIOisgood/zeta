import { ScrollView, Text } from 'react-native';
import { Touchable } from './touchable';
import type { ZDateRailProps } from './z-date-rail.types';

export type { ZDateRailDay, ZDateRailProps } from './z-date-rail.types';

/**
 * Horizontal rail of selectable day pills. Selected pill = accent fill /
 * on-accent text; unselected = surface-1 / on-surface. Radius 16 (rounded-2xl).
 */
export function ZDateRail({
  days,
  selectedKey,
  onSelect,
  className,
  style,
  contentPadding = 0,
  testID,
}: ZDateRailProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      testID={testID}
      className={className}
      style={style}
      contentContainerStyle={{
        flexDirection: 'row',
        gap: 8,
        paddingVertical: 2,
        paddingHorizontal: contentPadding,
      }}
    >
      {days.map((d, index) => {
        const selected = d.key === selectedKey;
        return (
          <Touchable
            key={d.key}
            testID={testID ? `${testID}-${index}` : undefined}
            accessibilityLabel={`${d.label} ${d.day} ${d.month}`}
            selected={selected}
            disabled={d.disabled}
            onPress={() => onSelect(d.key)}
            className={`w-[54px] items-center rounded-2xl py-2.5 ${
              selected ? 'bg-accent' : 'bg-surface-1'
            } ${d.disabled ? 'opacity-40' : ''}`}
          >
            <Text
              className={`text-xs font-bold uppercase ${
                selected ? 'text-on-accent' : 'text-on-surface-variant'
              }`}
            >
              {d.label}
            </Text>
            <Text
              className={`mt-0.5 text-lg font-extrabold ${
                selected ? 'text-on-accent' : 'text-on-surface'
              }`}
              // Copy rule "numbers/time tabular" — day numbers align across pills.
              style={{ fontVariant: ['tabular-nums'] }}
            >
              {d.day}
            </Text>
            <Text
              className={`text-[11px] font-semibold ${
                selected ? 'text-on-accent' : 'text-on-surface-variant'
              }`}
            >
              {d.month}
            </Text>
          </Touchable>
        );
      })}
    </ScrollView>
  );
}
