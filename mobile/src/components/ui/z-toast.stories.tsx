import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { ToastCard, type ZToast } from './z-toast';

// The live ZToastHost is store-driven and auto-dismisses after 3s, so it cannot be
// shown statically in a catalog. Mirroring the web `z-toast` story, we render the
// presentational ToastCard directly with a no-op dismiss so every tone stays put.
// ToastCard is now the M3 dark inverse-surface pill (single line, leading tone
// dot, no dismiss "X").
const noop = () => {};

const toast = (
  id: number,
  tone: ZToast['tone'],
  title: string,
  message?: string,
  action?: ZToast['action'],
): ZToast => ({
  id,
  tone,
  title,
  message,
  action,
});

const meta = {
  title: 'UI/Toast',
  component: ToastCard,
  args: {
    toast: toast(1, 'info', 'Video uploaded', 'Your coach has been notified and will review it shortly.'),
    onDismiss: noop,
  },
} satisfies Meta<typeof ToastCard>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const Matrix: Story = {
  render: () => (
    <View className="gap-3">
      {/* every value of the ZToastTone union, each with an optional message */}
      <ToastCard toast={toast(1, 'success', 'Saved', 'Your changes have been saved.')} onDismiss={noop} />
      <ToastCard
        toast={toast(2, 'error', 'Upload failed', 'Check your connection and try again.')}
        onDismiss={noop}
      />
      <ToastCard
        toast={toast(3, 'info', 'Session starting soon', 'Your call begins in 5 minutes.')}
        onDismiss={noop}
      />
      {/* title only (no message) */}
      <ToastCard toast={toast(4, 'success', 'Invite sent')} onDismiss={noop} />
      {/* optional accent action label */}
      <ToastCard
        toast={toast(5, 'success', 'Member removed', undefined, { label: 'Undo', onPress: noop })}
        onDismiss={noop}
      />
      {/* single-line truncation (title + message clipped to one line) */}
      <ToastCard
        toast={toast(
          6,
          'info',
          'Reminder about your upcoming coaching session',
          'This long message is clipped to a single line in the compact pill.',
        )}
        onDismiss={noop}
      />
    </View>
  ),
};
