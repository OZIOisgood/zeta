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
  subtitle,
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
      {leading ? <View className="shrink-0">{leading}</View> : null}
      <View className="min-w-0 flex-1">
        <Text numberOfLines={1} className="text-[17px] text-on-surface">
          {title}
        </Text>
        {subtitle ? (
          <Text numberOfLines={2} className="mt-0.5 text-[15px] text-on-surface-variant">
            {subtitle}
          </Text>
        ) : null}
      </View>
      {trailing ? <View className="shrink-0">{trailing}</View> : null}
    </Touchable>
  );
}
