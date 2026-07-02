import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { LucidePlus } from 'lucide-react-native';
import { ZButton } from './z-button';

const meta = {
  title: 'UI/Button',
  component: ZButton,
  args: { label: 'Upload video', variant: 'primary', disabled: false, loading: false },
  argTypes: {
    variant: { control: 'radio', options: ['primary', 'secondary', 'ghost', 'danger', 'link'] },
    disabled: { control: 'boolean' },
    loading: { control: 'boolean' },
  },
} satisfies Meta<typeof ZButton>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const Matrix: Story = {
  render: () => (
    <View className="gap-3">
      {(['primary', 'secondary', 'ghost', 'danger', 'link'] as const).map((variant) => (
        <View key={variant} className="flex-row flex-wrap items-center gap-3">
          <ZButton label={variant} variant={variant} onPress={() => {}} />
          <ZButton label="disabled" variant={variant} disabled onPress={() => {}} />
          <ZButton label="loading" variant={variant} loading onPress={() => {}} />
          <ZButton label="icon" variant={variant} icon={<LucidePlus size={16} color="#fff" />} onPress={() => {}} />
        </View>
      ))}
    </View>
  ),
};
