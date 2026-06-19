/**
 * ZListItem — iOS implementation (Tier: Custom-RN).
 *
 * Grouped inset table-cell look per the HIG. Unlike the Material variant this is
 * a SQUARE cell (the enclosing inset-grouped ZCard/Section clips the group's
 * corners) with NO tonal fill — selection and press use the system look only:
 *   - title 17 / regular (onSurface), subtitle 15 / secondary (onSurfaceVariant)
 *   - taller padding (16pt vertical / 16pt horizontal)
 *   - system pressed-dim from Touchable (iOS pressed-opacity); no ripple, no
 *     secondary-container fill.
 *
 * When `onPress` is omitted the row renders as a plain `<View>` (no Touchable):
 * non-interactive containers that surface their own controls must not pose as a
 * button. Only the pressable path carries the accessibilityLabel.
 *
 * Self-import ban: this file does NOT import `./z-list-item` (Metro would
 * resolve that back to this very file → infinite re-export). It composes
 * `Touchable` and the shared `.types.ts` directly.
 *
 * `className` is forwarded onto the Touchable container so consumer layout
 * classes (margins, etc.) apply on real device builds.
 *
 * HIG reference: https://developer.apple.com/design/human-interface-guidelines/lists
 */

import { Text, View } from 'react-native';

import { Touchable } from './touchable';
import type { ZListItemProps } from './z-list-item.types';

export type { ZListItemProps } from './z-list-item.types';

export function ZListItem({
  leading,
  title,
  titleAccessory,
  subtitle,
  subtitleNumberOfLines = 3,
  trailing,
  onPress,
  selected = false,
  disabled = false,
  className,
  style,
  testID,
}: ZListItemProps) {
  const dim = disabled ? 'opacity-50' : '';

  // iOS grouped cell: square (the enclosing inset-grouped card clips the
  // group), surface fill, no tonal selection fill — taller padding per HIG.
  const containerClasses = ['flex-row items-center gap-3 bg-surface px-4 py-4', dim, className]
    .filter(Boolean)
    .join(' ');

  // Shared inner content — identical for the pressable and the plain-container
  // paths so the two branches stay in visual lock-step.
  const content = (
    <>
      {leading ? <View className="shrink-0">{leading}</View> : null}
      <View className="min-w-0 flex-1">
        <View className="flex-row items-center gap-2">
          <Text numberOfLines={1} className="min-w-0 flex-1 text-base font-bold text-on-surface">
            {title}
          </Text>
          {titleAccessory ? <View className="shrink-0">{titleAccessory}</View> : null}
        </View>
        {subtitle ? (
          <Text
            numberOfLines={subtitleNumberOfLines}
            className="mt-0.5 text-[15px] text-on-surface-variant"
          >
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
  // button role, haptic, or system pressed-dim. Only the pressable path carries
  // the accessibilityLabel.
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
      selected={selected ? true : undefined}
      accessibilityLabel={title}
      className={containerClasses}
      style={style}
    >
      {content}
    </Touchable>
  );
}
