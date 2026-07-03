import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useState } from 'react';
import { View } from 'react-native';
import { LucideUsers } from 'lucide-react-native';
import { colors } from '../../theme/colors';
import { ZAvatar } from './z-avatar';
import { ZBadge } from './z-badge';
import { ZIconButton } from './z-icon-button';
import { ZIconTile } from './z-icon-tile';
import { ZSwitch } from './z-switch';
import { ZSymbol } from './z-symbol';
import { ZListItem } from './z-list-item';

const meta = {
  title: 'UI/List Item',
  component: ZListItem,
  args: {
    title: 'Notifications',
    subtitle: 'Manage which alerts you receive',
    onPress: () => {},
    selected: false,
    disabled: false,
  },
  argTypes: {
    title: { control: 'text' },
    subtitle: { control: 'text' },
    selected: { control: 'boolean' },
    disabled: { control: 'boolean' },
  },
} satisfies Meta<typeof ZListItem>;
export default meta;

type Story = StoryObj<typeof meta>;

const chevron = <ZSymbol name="chevron-right" label="" size={18} color={colors.muted} />;

export const Playground: Story = {
  args: {
    leading: <ZIconTile tone="primary" icon={<LucideUsers size={18} color={colors.primary} />} />,
    trailing: chevron,
  },
};

/** Switch trailing — controlled state lives in a proper component (rules-of-hooks). */
function SwitchRow() {
  const [enabled, setEnabled] = useState(true);
  return (
    <ZListItem
      title="Push notifications"
      subtitle="Get notified about new reviews"
      trailing={
        <ZSwitch checked={enabled} onChange={setEnabled} accessibilityLabel="Push notifications" />
      }
    />
  );
}

/** Leading variants: icon-tile vs avatar; trailing variants: chevron / badge / switch. */
export const Matrix: Story = {
  render: () => (
    <View className="gap-2">
      {/* Icon-tile leading + chevron trailing, with subtitle */}
      <ZListItem
        title="Members"
        subtitle="12 people"
        leading={<ZIconTile tone="primary" icon={<LucideUsers size={18} color={colors.primary} />} />}
        trailing={chevron}
        onPress={() => {}}
      />
      {/* Avatar leading + badge trailing, no subtitle */}
      <ZListItem
        title="Jane Cooper"
        leading={<ZAvatar fallback="JC" size={40} shape="circle" alt="Jane Cooper" />}
        trailing={<ZBadge label="Admin" tone="primary" />}
        onPress={() => {}}
      />
      {/* Switch trailing — non-interactive row (its own control, no button role) */}
      <SwitchRow />
      {/* Title accessory (a badge inline on the title line) + 3-line subtitle,
          non-interactive container that surfaces its own trailing controls */}
      <ZListItem
        title="Discovery call"
        titleAccessory={<ZBadge label="30 min" tone="neutral" />}
        subtitle="A short introductory session to align on goals, expectations, and the coaching cadence before booking a full engagement."
        trailing={
          <>
            <ZIconButton label="Edit" onPress={() => {}}>
              <ZSymbol name="edit" label="" size={18} color={colors.muted} />
            </ZIconButton>
            <ZIconButton label="Delete" onPress={() => {}}>
              <ZSymbol name="trash" label="" size={18} color={colors.muted} />
            </ZIconButton>
          </>
        }
      />
      {/* Selected (tonal fill on Material) */}
      <ZListItem
        title="Selected row"
        subtitle="secondary-container fill"
        leading={<ZIconTile tone="success" icon={<LucideUsers size={18} color={colors.success} />} />}
        trailing={chevron}
        selected
        onPress={() => {}}
      />
      {/* Disabled (dimmed, press blocked) */}
      <ZListItem
        title="Disabled row"
        subtitle="press is blocked"
        leading={<ZIconTile tone="neutral" icon={<LucideUsers size={18} color={colors.primary} />} />}
        trailing={chevron}
        disabled
        onPress={() => {}}
      />
      {/* Title-only, no leading/trailing */}
      <ZListItem title="Plain title-only row" onPress={() => {}} />
    </View>
  ),
};
