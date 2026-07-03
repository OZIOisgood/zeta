import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { ZDangerZoneCard } from './z-danger-zone-card';

const meta = {
  title: 'UI/Danger Zone Card',
  component: ZDangerZoneCard,
  args: {
    title: 'Delete group',
    description: 'Permanently remove this group and all of its data. This action cannot be undone.',
    actionLabel: 'Delete group',
    confirmTitle: 'Delete group?',
    confirmMessage: 'This permanently deletes the group for everyone. This cannot be undone.',
    confirmLabel: 'Delete group',
    loading: false,
    disabled: false,
    onAction: () => {},
  },
  argTypes: {
    loading: { control: 'boolean' },
    disabled: { control: 'boolean' },
  },
} satisfies Meta<typeof ZDangerZoneCard>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const States: Story = {
  render: () => (
    <View className="gap-3">
      {/* default */}
      <ZDangerZoneCard
        title="Delete group"
        description="Permanently remove this group and all of its data. This action cannot be undone."
        actionLabel="Delete group"
        confirmTitle="Delete group?"
        confirmMessage="This permanently deletes the group for everyone. This cannot be undone."
        confirmLabel="Delete group"
        onAction={() => {}}
      />

      {/* loading */}
      <ZDangerZoneCard
        title="Delete group"
        description="Permanently remove this group and all of its data. This action cannot be undone."
        actionLabel="Delete group"
        confirmTitle="Delete group?"
        confirmMessage="This permanently deletes the group for everyone. This cannot be undone."
        confirmLabel="Delete group"
        loading
        onAction={() => {}}
      />

      {/* disabled */}
      <ZDangerZoneCard
        title="Delete group"
        description="Permanently remove this group and all of its data. This action cannot be undone."
        actionLabel="Delete group"
        confirmTitle="Delete group?"
        confirmMessage="This permanently deletes the group for everyone. This cannot be undone."
        confirmLabel="Delete group"
        disabled
        onAction={() => {}}
      />

      {/* long-text overflow */}
      <ZDangerZoneCard
        title="Delete your account and every coaching session, video, and group you have ever created"
        description="This permanently erases your profile, all uploaded videos, every review, scheduled live coaching session, and group membership across the entire platform. There is absolutely no way to recover any of this once it is gone, so please be completely certain before you continue."
        actionLabel="Delete my account permanently"
        confirmTitle="Permanently delete your account?"
        confirmMessage="Every video, review, session, and group tied to your account will be erased forever and cannot be restored by anyone."
        confirmLabel="Delete my account permanently"
        onAction={() => {}}
      />
    </View>
  ),
};
