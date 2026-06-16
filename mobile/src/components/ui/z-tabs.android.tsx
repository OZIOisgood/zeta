/**
 * ZTabs — Android implementation (Jetpack Compose via @expo/ui/jetpack-compose).
 *
 * Renders a Material 3 `SingleChoiceSegmentedButtonRow` where each tab is a
 * `SegmentedButton`. The selected button uses `accent` as its active container
 * and border color; unselected buttons use `surface`/`outline` tokens.
 *
 * Count-badge: `SingleChoiceSegmentedButtonRow` has no badge slot. When `count`
 * is defined the label is formatted as "Label (N)" so the count remains visible.
 *
 * Colors come exclusively from theme/native.ts role tokens via useRoleColors().
 *
 * @expo/ui version: ~56.0.17
 * Material 3 reference: https://m3.material.io/components/segmented-buttons/overview
 */

import { Host, SegmentedButton, SingleChoiceSegmentedButtonRow, Text } from '@expo/ui/jetpack-compose';
import { View } from 'react-native';
import { useRoleColors } from '../../theme/native';
import type { ZTabsProps } from './z-tabs.types';

export type { ZTab, ZTabsProps } from './z-tabs.types';

export function ZTabs({ tabs, activeId, onChange, testID }: ZTabsProps) {
  const { color } = useRoleColors();

  return (
    // Wrap in an RN View to carry testID; Android Host's PrimitiveBaseProps
    // does not include a testID field (unlike iOS Host).
    <View testID={testID}>
      <Host matchContents={{ vertical: true }}>
      <SingleChoiceSegmentedButtonRow>
        {tabs.map((tab) => {
          const selected = tab.id === activeId;
          const label = tab.count !== undefined ? `${tab.label} (${tab.count})` : tab.label;
          return (
            <SegmentedButton
              key={tab.id}
              selected={selected}
              onClick={() => onChange(tab.id)}
              colors={{
                activeContainerColor: color('accentContainer'),
                // Dark label for AA: onAccentContainer (#c2410c) is only 3.82:1 on
                // accentContainer; onSurface is ~11:1. Selection still reads via the
                // container fill + accent border + check icon.
                activeContentColor: color('onSurface'),
                activeBorderColor: color('accent'),
                inactiveContainerColor: color('surface'),
                inactiveContentColor: color('onSurface'),
                inactiveBorderColor: color('outline'),
              }}
            >
              <SegmentedButton.Label>
                <Text>{label}</Text>
              </SegmentedButton.Label>
            </SegmentedButton>
          );
        })}
      </SingleChoiceSegmentedButtonRow>
      </Host>
    </View>
  );
}
