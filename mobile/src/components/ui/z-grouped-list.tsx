/**
 * ZGroupedList — inset-grouped list primitive (Tier: custom-no-native).
 *
 * One surface card holding rows separated by hairline ZDividers — the idiom
 * previously hand-rolled in Profile / Preferences / Availability. See
 * z-grouped-list.types.ts for the embed-vs-scroll mode contract.
 */

import type { ReactElement } from 'react';
import { FlatList, View } from 'react-native';
import { useRoleColors, type Role } from '../../theme/native';
import { ZCard } from './z-card';
import { ZDivider } from './z-divider';
import type { ZGroupedListProps, ZGroupedListTone } from './z-grouped-list.types';

export type { ZGroupedListProps } from './z-grouped-list.types';

// Tonal fill → the role token used for the card surface (mirrors ZCard's tones).
const TONE_ROLE: Record<ZGroupedListTone, Role> = {
  surface: 'surface',
  accent: 'accentContainer',
  secondary: 'secondaryContainer',
};

export function ZGroupedList<T>({
  data,
  keyExtractor,
  renderItem,
  inset = true,
  tone = 'surface',
  scroll = false,
  ListEmptyComponent,
  keyboardShouldPersistTaps,
  contentContainerStyle,
  className,
  testID,
}: ZGroupedListProps<T>) {
  const { color } = useRoleColors();
  const separator = () => <ZDivider inset={inset} />;

  if (scroll) {
    // Standalone virtualized list styled as the grouped card. The card surface +
    // rounding + 16dp inner padding live on the content container (which hugs its
    // content height and scrolls when taller than the viewport).
    //
    // ⚠️ Because the content container IS the card, a caller `paddingBottom`
    // renders as empty card interior (the Availability card once carried its
    // 96dp FAB clearance INSIDE the surface). Scroll clearance below the card
    // belongs in `marginBottom` — padding only for space between rows and the
    // card edge.
    return (
      <FlatList
        testID={testID}
        data={data as T[]}
        keyExtractor={keyExtractor}
        renderItem={({ item, index }) => <>{renderItem(item, index)}</>}
        ItemSeparatorComponent={separator}
        ListEmptyComponent={ListEmptyComponent as ReactElement | undefined}
        keyboardShouldPersistTaps={keyboardShouldPersistTaps}
        style={{ flex: 1 }}
        contentContainerStyle={[
          {
            margin: 16,
            padding: 16,
            borderRadius: 20,
            overflow: 'hidden',
            backgroundColor: color(TONE_ROLE[tone]),
          },
          contentContainerStyle,
        ]}
      />
    );
  }

  // Embedded in a form ScrollView: plain card + map, no nested virtualization.
  return (
    <ZCard tone={tone} className={className} testID={testID}>
      {data.map((item, index) => (
        <View key={keyExtractor(item, index)}>
          {index > 0 ? separator() : null}
          {renderItem(item, index)}
        </View>
      ))}
    </ZCard>
  );
}
