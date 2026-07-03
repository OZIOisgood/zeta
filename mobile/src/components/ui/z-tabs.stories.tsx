import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useState, type ComponentProps } from 'react';
import { View } from 'react-native';
import { ZTabs, type ZTab } from './z-tabs';

const tabs: ZTab[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'videos', label: 'Videos', count: 3 },
  { id: 'members', label: 'Members', count: 12 },
];

// Hooks must live in a component (not directly in `render`) to satisfy
// react-hooks/rules-of-hooks; this makes the Playground tabs interactive.
function TabsDemo(args: ComponentProps<typeof ZTabs>) {
  const [activeId, setActiveId] = useState(args.activeId);
  return <ZTabs {...args} activeId={activeId} onChange={setActiveId} />;
}

const meta = {
  title: 'UI/Tabs',
  component: ZTabs,
  args: { tabs, activeId: 'overview', onChange: () => {} },
  argTypes: {
    activeId: { control: 'radio', options: tabs.map((tab) => tab.id) },
  },
  render: (args) => <TabsDemo {...args} />,
} satisfies Meta<typeof ZTabs>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const States: Story = {
  render: () => {
    const withoutCounts: ZTab[] = [
      { id: 'overview', label: 'Overview' },
      { id: 'settings', label: 'Settings' },
    ];
    const withCounts: ZTab[] = [
      { id: 'inbox', label: 'Inbox', count: 0 },
      { id: 'sent', label: 'Sent', count: 8 },
      { id: 'archived', label: 'Archived', count: 142 },
    ];
    const longText: ZTab[] = [
      { id: 'a', label: 'Pending coaching reviews', count: 5 },
      { id: 'b', label: 'Completed video assessments' },
    ];
    const single: ZTab[] = [{ id: 'only', label: 'All' }];

    return (
      <View className="gap-3">
        {/* labels only, first selected */}
        <ZTabs tabs={withoutCounts} activeId="overview" onChange={() => {}} />
        {/* with count badges (incl. zero), middle selected */}
        <ZTabs tabs={withCounts} activeId="sent" onChange={() => {}} />
        {/* long-text overflow, last selected */}
        <ZTabs tabs={longText} activeId="b" onChange={() => {}} />
        {/* single tab */}
        <ZTabs tabs={single} activeId="only" onChange={() => {}} />
      </View>
    );
  },
};
