import { Text, View } from 'react-native';

import { Touchable } from './touchable';
import type { ZListItemProps } from './z-list-item.types';

export type { ZListItemProps } from './z-list-item.types';

/**
 * ZListItem — Material 3 / bare fallback (web · Storybook · jest · Android).
 *
 * The Material look IS the contract surface (jest renders this file via the
 * package.json moduleNameMapper block, which forces the bare `.tsx` over the
 * `.ios.tsx`; web/Storybook resolve `.tsx` directly). The iOS grouped-inset
 * table-cell look lives in z-list-item.ios.tsx.
 *
 * A list ROW has no clean OS-widget counterpart (@expo/ui exposes container
 * `List`/`Section` on iOS and a slot-only `ListItem` without `onPress` on
 * Android — neither wraps arbitrary RN leading/trailing nodes), so this is an RN
 * composition of `Touchable` (Android ripple / iOS pressed-dim + haptics + a11y)
 * and a leading · (title + subtitle) · trailing layout.
 *
 * Material 3 look:
 *   - title 15 / weight 700 (bold), subtitle 13 / 400
 *   - 16dp container corner radius
 *   - selected fill = secondary-container; unselected = surface
 *   - M3 state layer: Touchable's Android ripple
 *
 * Colors via role-token NativeWind classes only — never raw hex.
 */
export function ZListItem({
  leading,
  title,
  subtitle,
  trailing,
  onPress,
  selected = false,
  disabled = false,
  className,
  style,
  testID,
}: ZListItemProps) {
  // Material rows are tonal rounded tiles: secondary-container fill when
  // selected, surface otherwise.
  const fill = selected ? 'bg-secondary-container' : 'bg-surface';
  const dim = disabled ? 'opacity-50' : '';

  const containerClasses = [
    'flex-row items-center gap-3 rounded-[16px] px-3 py-3',
    fill,
    dim,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <Touchable
      testID={testID}
      onPress={onPress}
      disabled={disabled}
      // Only announce selection when explicitly selected; leave unset otherwise
      // so screen readers don't read "not selected" on plain rows.
      selected={selected ? true : undefined}
      accessibilityLabel={title}
      className={containerClasses}
      style={style}
    >
      {leading ? <View className="shrink-0">{leading}</View> : null}
      <View className="min-w-0 flex-1">
        <Text numberOfLines={1} className="text-[15px] font-bold text-on-surface">
          {title}
        </Text>
        {subtitle ? (
          <Text numberOfLines={2} className="mt-0.5 text-[13px] text-on-surface-variant">
            {subtitle}
          </Text>
        ) : null}
      </View>
      {trailing ? <View className="shrink-0">{trailing}</View> : null}
    </Touchable>
  );
}
