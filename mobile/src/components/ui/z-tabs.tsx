import { Pressable, Text, View } from 'react-native';
import { ZBadge } from './z-badge';
import type { ZTabsProps } from './z-tabs.types';

export type { ZTab, ZTabsProps } from './z-tabs.types';

/**
 * ZTabs — NativeWind fallback (web / Storybook / jest).
 *
 * Horizontal selectable tab bar. Mobile counterpart of the web `z-tabs`
 * wrapper (web/dashboard-next/src/app/shared/ui/tabs/). Consumers render the
 * active panel themselves. When a tab has a `count`, it renders via `ZBadge`.
 * On native platforms the .ios.tsx and .android.tsx variants replace this
 * with OS-native segmented controls.
 */
export function ZTabs({ tabs, activeId, onChange, testID }: ZTabsProps) {
  return (
    <View testID={testID} className="flex-row border-b border-z-border">
      {tabs.map((tab) => {
        const selected = tab.id === activeId;
        return (
          <Pressable
            key={tab.id}
            accessibilityRole="tab"
            accessibilityLabel={tab.label}
            accessibilityState={{ selected }}
            onPress={() => onChange(tab.id)}
            className={`-mb-px flex-row items-center gap-2 border-b-2 px-3 py-3 ${
              selected ? 'border-z-primary' : 'border-transparent'
            }`}
          >
            <Text
              className={`text-sm font-semibold ${selected ? 'text-z-text' : 'text-z-muted'}`}
            >
              {tab.label}
            </Text>
            {tab.count !== undefined ? <ZBadge label={String(tab.count)} /> : null}
          </Pressable>
        );
      })}
    </View>
  );
}
