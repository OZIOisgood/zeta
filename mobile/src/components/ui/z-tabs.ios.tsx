/**
 * ZTabs — iOS implementation (SwiftUI via @expo/ui/swift-ui).
 *
 * Renders a SwiftUI Picker with `pickerStyle('segmented')`, which maps to
 * the native UISegmentedControl. Each tab becomes a `Text` child with a `tag`
 * modifier equal to the tab's `id`.
 *
 * Count-badge: UISegmentedControl has no badge slot. When `count` is defined
 * the label is formatted as "Label (N)" so the count remains visible.
 *
 * Colors: `accentColor` tints the selected segment via the `tint` modifier.
 * SwiftUI automatically handles selected/unselected states using system colors.
 *
 * HIG reference: https://developer.apple.com/design/human-interface-guidelines/segmented-controls
 * @expo/ui version: ~56.0.17
 */

import { Host, Picker, Text } from '@expo/ui/swift-ui';
import { pickerStyle, tag, tint } from '@expo/ui/swift-ui/modifiers';
import { useRoleColors } from '../../theme/native';
import type { ZTabsProps } from './z-tabs.types';

export type { ZTab, ZTabsProps } from './z-tabs.types';

export function ZTabs({ tabs, activeId, onChange, testID }: ZTabsProps) {
  const { color } = useRoleColors();

  return (
    <Host matchContents={{ vertical: true }} testID={testID}>
      <Picker
        selection={activeId}
        onSelectionChange={(id) => onChange(id as string)}
        modifiers={[pickerStyle('segmented'), tint(color('accent'))]}
      >
        {tabs.map((tab) => {
          const label = tab.count !== undefined ? `${tab.label} (${tab.count})` : tab.label;
          return (
            <Text key={tab.id} modifiers={[tag(tab.id)]}>
              {label}
            </Text>
          );
        })}
      </Picker>
    </Host>
  );
}
