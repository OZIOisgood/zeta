/**
 * ZTabs — Android implementation (Jetpack Compose via @expo/ui/jetpack-compose).
 *
 * Renders a Material 3 `SingleChoiceSegmentedButtonRow` where each tab is a
 * `SegmentedButton`. The selected button uses the warm `secondaryContainer` fill
 * (matching the Chip / nav-pill selection language) with an `accent` border;
 * unselected buttons match the screen `background` (per the handoff: the inactive
 * fields are the same color as the page), defined only by their `outline`.
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
                // Warm secondary-container "on" state — matches the Chip / nav-pill
                // selection language. onSecondaryContainer is AA-contrast on
                // secondaryContainer; selection also reads via the accent border + check icon.
                activeContainerColor: color('secondaryContainer'),
                activeContentColor: color('onSecondaryContainer'),
                activeBorderColor: color('accent'),
                // Unselected segments match the SCREEN BACKGROUND, not a darker
                // surface: the handoff shows the inactive fields as the same color
                // as the page, defined only by their outline. `surface`/`surfaceVariant`
                // both render visibly DARKER than `background` (#fff8f4) on this screen
                // (which read as wrong); M3's own default inactive container is
                // transparent, and `background` is the token-equivalent here.
                inactiveContainerColor: color('background'),
                inactiveContentColor: color('onSurface'),
                inactiveBorderColor: color('outline'),
              }}
            >
              <SegmentedButton.Label>
                {/* M3 medium (600) — segment labels use the medium weight.
                    Compose <Text> needs the loaded face named explicitly (the
                    RN Text.render brand-font patch does not reach Compose). */}
                <Text style={{ fontWeight: '600', fontFamily: 'NunitoSans_600SemiBold' }}>{label}</Text>
              </SegmentedButton.Label>
            </SegmentedButton>
          );
        })}
      </SingleChoiceSegmentedButtonRow>
      </Host>
    </View>
  );
}
