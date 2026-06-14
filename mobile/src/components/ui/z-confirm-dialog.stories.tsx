import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { ZConfirmDialog } from './z-confirm-dialog';

const meta = {
  title: 'UI/Confirm Dialog',
  component: ZConfirmDialog,
  args: {
    visible: true,
    title: 'Delete this video?',
    description: 'This permanently removes the video and all of its review comments.',
    tone: 'danger',
    confirmLabel: 'Delete',
    cancelLabel: 'Cancel',
    confirmOnly: false,
    confirmDisabled: false,
    onConfirm: () => {},
    onCancel: () => {},
  },
  argTypes: {
    tone: { control: 'radio', options: ['info', 'warning', 'danger'] },
    confirmOnly: { control: 'boolean' },
    confirmDisabled: { control: 'boolean' },
    visible: { control: 'boolean' },
  },
} satisfies Meta<typeof ZConfirmDialog>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const States: Story = {
  render: () => (
    <View className="gap-3">
      {/* tone: info */}
      <ZConfirmDialog
        visible
        tone="info"
        title="Leave this group?"
        description="You can rejoin later with an invite link."
        confirmLabel="Leave group"
        cancelLabel="Cancel"
        onConfirm={() => {}}
        onCancel={() => {}}
      />

      {/* tone: warning */}
      <ZConfirmDialog
        visible
        tone="warning"
        title="Discard unsaved changes?"
        description="Your edits to this session will be lost."
        confirmLabel="Discard"
        cancelLabel="Keep editing"
        onConfirm={() => {}}
        onCancel={() => {}}
      />

      {/* tone: danger */}
      <ZConfirmDialog
        visible
        tone="danger"
        title="Delete this video?"
        description="This permanently removes the video and all of its review comments."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={() => {}}
        onCancel={() => {}}
      />

      {/* confirmDisabled: in-flight mutation */}
      <ZConfirmDialog
        visible
        tone="danger"
        title="Removing member…"
        description="The member is being removed from the group."
        confirmLabel="Remove"
        cancelLabel="Cancel"
        confirmDisabled
        onConfirm={() => {}}
        onCancel={() => {}}
      />

      {/* confirmOnly: single acknowledge button, no cancel */}
      <ZConfirmDialog
        visible
        tone="info"
        title="Session ended"
        description="The live coaching session has finished. You can review the recording shortly."
        confirmLabel="Got it"
        confirmOnly
        onConfirm={() => {}}
        onCancel={() => {}}
      />

      {/* without optional description */}
      <ZConfirmDialog
        visible
        tone="warning"
        title="Cancel this upload?"
        confirmLabel="Cancel upload"
        cancelLabel="Keep uploading"
        onConfirm={() => {}}
        onCancel={() => {}}
      />

      {/* long-text overflow */}
      <ZConfirmDialog
        visible
        tone="danger"
        title="Permanently delete your entire coaching workspace and every associated video, session, and group?"
        description="This is irreversible. All uploaded videos, recorded live sessions, review comments, group memberships, and pending invitations will be erased and cannot be recovered by support."
        confirmLabel="Delete everything"
        cancelLabel="No, keep my workspace"
        onConfirm={() => {}}
        onCancel={() => {}}
      />
    </View>
  ),
};
