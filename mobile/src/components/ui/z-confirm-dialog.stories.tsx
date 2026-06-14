import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { ZConfirmDialog } from './z-confirm-dialog';

// ZConfirmDialog is a full-screen modal overlay, so each tone/state is its OWN
// story export (Storybook renders one at a time) — stacking them in a single
// canvas would overlap their backdrops and only the topmost would be legible.
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

export const Info: Story = {
  args: {
    tone: 'info',
    title: 'Leave this group?',
    description: 'You can rejoin later with an invite link.',
    confirmLabel: 'Leave group',
    cancelLabel: 'Cancel',
  },
};

export const Warning: Story = {
  args: {
    tone: 'warning',
    title: 'Discard unsaved changes?',
    description: 'Your edits to this session will be lost.',
    confirmLabel: 'Discard',
    cancelLabel: 'Keep editing',
  },
};

export const Danger: Story = {
  args: {
    tone: 'danger',
    title: 'Delete this video?',
    description: 'This permanently removes the video and all of its review comments.',
    confirmLabel: 'Delete',
    cancelLabel: 'Cancel',
  },
};

export const ConfirmDisabled: Story = {
  args: {
    tone: 'danger',
    title: 'Removing member…',
    description: 'The member is being removed from the group.',
    confirmLabel: 'Remove',
    cancelLabel: 'Cancel',
    confirmDisabled: true,
  },
};

export const ConfirmOnly: Story = {
  args: {
    tone: 'info',
    title: 'Session ended',
    description: 'The live coaching session has finished. You can review the recording shortly.',
    confirmLabel: 'Got it',
    confirmOnly: true,
  },
};

export const NoDescription: Story = {
  args: {
    tone: 'warning',
    title: 'Cancel this upload?',
    description: undefined,
    confirmLabel: 'Cancel upload',
    cancelLabel: 'Keep uploading',
  },
};

export const LongText: Story = {
  args: {
    tone: 'danger',
    title:
      'Permanently delete your entire coaching workspace and every associated video, session, and group?',
    description:
      'This is irreversible. All uploaded videos, recorded live sessions, review comments, group memberships, and pending invitations will be erased and cannot be recovered by support.',
    confirmLabel: 'Delete everything',
    cancelLabel: 'No, keep my workspace',
  },
};
