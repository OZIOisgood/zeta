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
 * composition of a leading · (title + subtitle) · trailing layout. When
 * `onPress` is provided the row is a `Touchable` (Android ripple / iOS
 * pressed-dim + haptics + a11y button role); when it is omitted the row is a
 * plain `<View>` — non-interactive containers that surface their OWN controls
 * (switch, button) must not pose as a button.
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
  titleAccessory,
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

  // Shared inner content — identical for the pressable and the plain-container
  // paths so the two branches stay in visual lock-step.
  const content = (
    <>
      {leading ? <View className="shrink-0">{leading}</View> : null}
      <View className="min-w-0 flex-1">
        <View className="flex-row items-center gap-2">
          <Text numberOfLines={1} className="min-w-0 flex-1 text-[15px] font-bold text-on-surface">
            {title}
          </Text>
          {titleAccessory ? <View className="shrink-0">{titleAccessory}</View> : null}
        </View>
        {subtitle ? (
          <Text numberOfLines={3} className="mt-0.5 text-[13px] text-on-surface-variant">
            {subtitle}
          </Text>
        ) : null}
      </View>
      {trailing ? (
        <View className="shrink-0 flex-row items-center gap-2">{trailing}</View>
      ) : null}
    </>
  );

  // Non-interactive rows (no onPress) render as a plain container: they hold
  // their OWN controls (a switch, button, or icon-button) and must NOT expose a
  // button role, haptic, or press dim/ripple. Only the pressable path carries
  // the accessibilityLabel (a plain container shouldn't announce itself as a
  // labeled button).
  if (!onPress) {
    return (
      <View
        testID={testID}
        className={containerClasses}
        style={style}
        accessibilityState={{
          ...(disabled ? { disabled: true } : {}),
          ...(selected ? { selected: true } : {}),
        }}
      >
        {content}
      </View>
    );
  }

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
      {content}
    </Touchable>
  );
}
