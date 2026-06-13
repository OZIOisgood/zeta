import { Pressable, Text, View } from 'react-native';
import { ZBadge } from './z-badge';

export type ZTab = {
  id: string;
  label: string;
  count?: number;
};

/**
 * Horizontal selectable tab bar. Mobile counterpart of the web `z-tabs`
 * wrapper (web/dashboard-next/src/app/shared/ui/tabs/). Consumers render the
 * active panel themselves. When a tab has a `count`, it renders via `ZBadge`.
 */
export function ZTabs({
  tabs,
  activeId,
  onChange,
  testID,
}: {
  tabs: ZTab[];
  activeId: string;
  onChange: (id: string) => void;
  testID?: string;
}) {
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
