import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useState } from 'react';
import { View } from 'react-native';
import { ZDateRail } from './z-date-rail';
import type { ZDateRailDay } from './z-date-rail.types';

const DAYS: ZDateRailDay[] = [
  { key: 'd0', label: 'Today', day: '18', month: 'Jun', isToday: true },
  { key: 'd1', label: 'Wed', day: '19', month: 'Jun' },
  { key: 'd2', label: 'Thu', day: '20', month: 'Jun' },
  { key: 'd3', label: 'Fri', day: '21', month: 'Jun' },
];

const meta = {
  title: 'UI/DateRail',
  component: ZDateRail,
  args: { days: DAYS, selectedKey: 'd0', onSelect: () => {}, testID: 'rail' },
  decorators: [(Story) => <View style={{ padding: 16 }}><Story /></View>],
} satisfies Meta<typeof ZDateRail>;
export default meta;

type Story = StoryObj<typeof meta>;

function DateRailDemo() {
  const [sel, setSel] = useState('d0');
  return <ZDateRail days={DAYS} selectedKey={sel} onSelect={setSel} testID="rail" />;
}

export const Default: Story = {
  render: () => <DateRailDemo />,
};
