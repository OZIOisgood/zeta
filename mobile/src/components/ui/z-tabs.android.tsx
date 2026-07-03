/**
 * ZTabs — Android implementation (Tier: Native, RN retreat).
 *
 * Compose retreat (@expo/ui ~56.0.17 defect #6, see mobile/AGENTS.md):
 * `SegmentedButton` hosts its label as an RN SlotView that reports the FULL
 * segment width to Compose instead of the text's width. Compose's internal
 * selected-segment row `[check][8dp][label]` then has no slack — the M3
 * default check (not overridable through @expo/ui; no `icon` prop is exposed)
 * pins to the segment's left edge while the label centers separately in its
 * oversized slot. The same mis-measurement made long labels wrap (previously
 * papered over with maxLines=1).
 *
 * This RN composition renders the UI-kit's Material SegmentedButton instead
 * (_ds_bundle.js components/navigation/SegmentedButton.jsx): a 40dp
 * full-width pill row with hairline dividers; the selected segment fills with
 * secondary-container and shows check + label CENTERED AS ONE GROUP — which
 * is also stock M3 behavior.
 *
 * Count-badge: no badge slot in the segmented idiom — `count` is appended to
 * the label ("Label (N)"), matching the kit screens and the iOS variant.
 *
 * Colors via role tokens only (NativeWind classes / useRoleColors).
 * Material 3 reference: https://m3.material.io/components/segmented-buttons/overview
 */

import { Pressable, Text, View } from 'react-native';

import { useRoleColors } from '../../theme/native';
import { ANDROID_RIPPLE_COLOR } from './touchable';
import type { ZTabsProps } from './z-tabs.types';
import { ZSymbol } from './z-symbol';

export type { ZTab, ZTabsProps } from './z-tabs.types';

export function ZTabs({ tabs, activeId, onChange, testID }: ZTabsProps) {
  const { color } = useRoleColors();

  return (
    <View
      testID={testID}
      accessibilityRole="tablist"
      className="h-10 flex-row overflow-hidden rounded-full border border-z-border"
    >
      {tabs.map((tab, index) => {
        const selected = tab.id === activeId;
        const label = tab.count !== undefined ? `${tab.label} (${tab.count})` : tab.label;
        return (
          <Pressable
            key={tab.id}
            accessibilityRole="tab"
            accessibilityLabel={label}
            accessibilityState={{ selected }}
            onPress={() => onChange(tab.id)}
            android_ripple={{ color: ANDROID_RIPPLE_COLOR }}
            className={`flex-1 flex-row items-center justify-center px-3 ${
              selected ? 'bg-secondary-container' : 'bg-transparent'
            } ${index > 0 ? 'border-l border-z-border' : ''}`}
            // The check + label center as ONE group (kit: gap 5).
            style={{ columnGap: 5 }}
          >
            {selected ? (
              <ZSymbol name="check" label="" size={15} color={color('onSecondaryContainer')} />
            ) : null}
            <Text
              numberOfLines={1}
              className={`text-sm font-semibold ${
                selected ? 'text-on-secondary-container' : 'text-on-surface-variant'
              }`}
            >
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
