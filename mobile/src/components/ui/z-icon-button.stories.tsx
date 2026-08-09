import type { ComponentProps } from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { LucidePencil, LucidePlus } from 'lucide-react-native';
import { ZIconButton } from './z-icon-button';

const meta = {
  title: 'UI/Icon Button',
  component: ZIconButton,
  // A default `children` satisfies the component's required prop at the meta
  // level, so individual stories don't have to pass `args`.
  args: {
    label: 'Edit',
    variant: 'primary',
    size: 'md',
    shape: 'rounded',
    children: <LucidePencil size={18} color="#fff" />,
  },
  argTypes: {
    variant: { control: 'radio', options: ['primary', 'secondary', 'ghost'] },
    size: { control: 'radio', options: ['sm', 'md', 'lg'] },
    shape: { control: 'radio', options: ['rounded', 'circle'] },
  },
  render: (args: ComponentProps<typeof ZIconButton>) => <ZIconButton {...args} />,
} satisfies Meta<typeof ZIconButton>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const Matrix: Story = {
  render: () => (
    <View className="gap-4">
      {(['primary', 'secondary', 'ghost'] as const).map((variant) => (
        <View key={variant} className="flex-row flex-wrap items-center gap-3">
          {(['sm', 'md', 'lg'] as const).map((size) =>
            (['rounded', 'circle'] as const).map((shape) => (
              <ZIconButton
                key={`${variant}-${size}-${shape}`}
                label={`${variant} ${size} ${shape}`}
                variant={variant}
                size={size}
                shape={shape}
                onPress={() => {}}
              >
                <LucidePlus size={18} color="#fff" />
              </ZIconButton>
            )),
          )}
        </View>
      ))}
    </View>
  ),
};
