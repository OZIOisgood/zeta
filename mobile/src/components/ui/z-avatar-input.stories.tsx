import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { ZAvatarInput } from './z-avatar-input';

const meta = {
  title: 'UI/Avatar Input',
  component: ZAvatarInput,
  args: {
    label: 'Select image',
    fallback: 'AB',
    alt: 'Profile picture',
    helperText: 'Square image, at least 200x200px.',
    disabled: false,
    onChange: () => {},
  },
  argTypes: {
    disabled: { control: 'boolean' },
  },
} satisfies Meta<typeof ZAvatarInput>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const States: Story = {
  render: () => (
    <View className="gap-3">
      {/* Empty: no value, falls back to initials */}
      <ZAvatarInput
        label="Select image"
        fallback="AB"
        alt="Profile picture"
        onChange={() => {}}
      />
      {/* With current value (image) */}
      <ZAvatarInput
        label="Select image"
        value="https://i.pravatar.cc/150?img=12"
        fallback="AB"
        alt="Profile picture"
        onChange={() => {}}
      />
      {/* With helper text */}
      <ZAvatarInput
        label="Select image"
        fallback="AB"
        alt="Profile picture"
        helperText="Square image, at least 200x200px."
        onChange={() => {}}
      />
      {/* Disabled */}
      <ZAvatarInput
        label="Select image"
        fallback="AB"
        alt="Profile picture"
        helperText="Square image, at least 200x200px."
        disabled
        onChange={() => {}}
      />
      {/* Long-text overflow: long label + long helper text */}
      <ZAvatarInput
        label="Choose a brand new profile picture from your library"
        fallback="AB"
        alt="Profile picture"
        helperText="Upload a square image that is at least 200x200 pixels; larger images are automatically cropped and resized for you."
        onChange={() => {}}
      />
      {/* Without optional fields: no fallback, no alt, no helper text */}
      <ZAvatarInput label="Select image" onChange={() => {}} />
    </View>
  ),
};
