import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { ZChip } from './z-chip';

const meta = {
  title: 'UI/Chip',
  component: ZChip,
  args: { label: 'Goalkeeping', selected: false, disabled: false },
  argTypes: {
    selected: { control: 'boolean' },
    disabled: { control: 'boolean' },
  },
} satisfies Meta<typeof ZChip>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const Matrix: Story = {
  render: () => (
    <View className="gap-3">
      <View className="flex-row flex-wrap items-center gap-3">
        <ZChip label="Default" onPress={() => {}} />
        <ZChip label="Selected" selected onPress={() => {}} />
        <ZChip label="Disabled" disabled onPress={() => {}} />
        <ZChip label="Selected disabled" selected disabled onPress={() => {}} />
      </View>
      <View className="flex-row flex-wrap items-center gap-3">
        <ZChip
          label="A very long chip label that overflows the available width"
          onPress={() => {}}
        />
        <ZChip
          label="A very long selected chip label that overflows"
          selected
          onPress={() => {}}
        />
      </View>
    </View>
  ),
};
