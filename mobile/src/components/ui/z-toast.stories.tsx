import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useEffect } from 'react';
import { View } from 'react-native';
import { ZToastHost, toastStore } from './z-toast';

/** Resets the store on mount, seeds the given toasts, and clears again on unmount. */
function useSeededToasts(seed: () => void) {
  useEffect(() => {
    toastStore.setState({ toasts: [] });
    seed();
    return () => toastStore.setState({ toasts: [] });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

/** Seeds the toast store and renders the host; keeps the hook out of `render`. */
function ToastPreview({ seed, className }: { seed: () => void; className: string }) {
  useSeededToasts(seed);
  return (
    <View className={className}>
      <ZToastHost />
    </View>
  );
}

/**
 * `ZToastHost` is a store-driven overlay with no public props: it renders the
 * active toasts from `toastStore`. Stories seed that store rather than passing
 * args, so there are no enumerated component props to wire as Storybook controls.
 */
const meta = {
  title: 'UI/Toast',
  component: ZToastHost,
} satisfies Meta<typeof ZToastHost>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Playground: Story = {
  render: () => (
    <ToastPreview
      className="min-h-32"
      seed={() =>
        toastStore.setState({
          toasts: [
            {
              id: 1,
              tone: 'info',
              title: 'Video uploaded',
              message: 'Your coach has been notified and will review it shortly.',
            },
          ],
        })
      }
    />
  ),
};

export const States: Story = {
  render: () => (
    <ToastPreview
      className="min-h-96"
      seed={() =>
        toastStore.setState({
          toasts: [
            // every value of the ZToastTone union, each with an optional message
            { id: 1, tone: 'success', title: 'Saved', message: 'Your changes have been saved.' },
            {
              id: 2,
              tone: 'error',
              title: 'Upload failed',
              message: 'Check your connection and try again.',
            },
            {
              id: 3,
              tone: 'info',
              title: 'Session starting soon',
              message: 'Your coaching call begins in 5 minutes.',
            },
            // without the optional message field (title only)
            { id: 4, tone: 'success', title: 'Invite sent' },
            // long-text overflow (wrapping title + message)
            {
              id: 5,
              tone: 'info',
              title:
                'Reminder about your upcoming coaching session with a very long title that should wrap',
              message:
                'This is an intentionally long toast message used to verify that wrapping and overflow behave correctly across the multi-line layout without pushing the dismiss control off screen.',
            },
          ],
        })
      }
    />
  ),
};
