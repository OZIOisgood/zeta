import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { ZBookingBar } from './z-booking-bar';

const meta = {
  title: 'UI/BookingBar',
  component: ZBookingBar,
  args: { ctaLabel: 'Next', onPress: () => {} },
} satisfies Meta<typeof ZBookingBar>;
export default meta;

type Story = StoryObj<typeof meta>;

export const WithSelection: Story = {
  args: { headline: '30 min', context: 'Video review · Alice Smith · 16:00' },
};

export const Empty: Story = {
  args: { hint: 'Choose a session type', ctaDisabled: true },
};
