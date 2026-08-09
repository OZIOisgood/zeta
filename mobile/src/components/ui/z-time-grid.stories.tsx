import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useState } from 'react';
import { View } from 'react-native';
import { ZTimeGrid } from './z-time-grid';
import type { ZTimeGridSlot } from './z-time-grid.types';

const SLOTS: ZTimeGridSlot[] = [
  { startsAt: '1', label: '16:00' },
  { startsAt: '2', label: '16:45' },
  { startsAt: '3', label: '17:30' },
  { startsAt: '4', label: '18:15' },
];

const meta = {
  title: 'UI/TimeGrid',
  component: ZTimeGrid,
  args: { slots: SLOTS, selectedStartsAt: '', onSelect: () => {}, hint: 'Duration 30 min', testID: 'grid' },
  decorators: [(Story) => <View style={{ padding: 16 }}><Story /></View>],
} satisfies Meta<typeof ZTimeGrid>;
export default meta;

type Story = StoryObj<typeof meta>;

function TimeGridDemo() {
  const [sel, setSel] = useState('');
  return (
    <ZTimeGrid slots={SLOTS} selectedStartsAt={sel} onSelect={setSel} hint="Duration 30 min" testID="grid" />
  );
}

export const Default: Story = {
  render: () => <TimeGridDemo />,
};
