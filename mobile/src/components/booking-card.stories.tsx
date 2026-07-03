import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import type { Booking } from '../api/queries/coaching';
import { BookingCard } from './booking-card';
import { mockBookingUpcoming, mockBookingPast } from './__stories__/fixtures';

// The current user is the student in the shared fixtures, so the card renders
// the expert as the counterpart. Reused as the default `currentUserId` so the
// counterpart label/name resolve consistently across stories.
const STUDENT_ID = mockBookingUpcoming.student_id;

// ── Inline fixtures for variations not covered by the shared fixtures ─────────
// (fixtures.ts is edited by other agents in parallel, so these stay local.)

/** Cancelled booking with a reason — exercises the danger badge + reason line. */
const mockBookingCancelled: Booking = {
  ...mockBookingUpcoming,
  id: 'bkg_story_cancelled',
  status: 'cancelled',
  cancellation_reason: 'Expert unavailable due to a scheduling conflict.',
  cancelled_by: mockBookingUpcoming.expert_id,
};

/** Done booking with a ready recording — exercises the success badge + open-recording button. */
const mockBookingRecordingReady: Booking = {
  ...mockBookingPast,
  id: 'bkg_story_recording_ready',
  recording: { status: 'ready', asset_id: 'ast_story_recording_0001' },
};

/** Done booking with a failed recording — exercises the danger recording badge, no button. */
const mockBookingRecordingFailed: Booking = {
  ...mockBookingPast,
  id: 'bkg_story_recording_failed',
  recording: { status: 'failed' },
};

/** Done booking with a still-processing recording — primary processing badge, no button. */
const mockBookingRecordingProcessing: Booking = {
  ...mockBookingPast,
  id: 'bkg_story_recording_processing',
  recording: { status: 'processing' },
};

/** Upcoming booking with a very long session type name + long notes — overflow/truncation. */
const mockBookingLong: Booking = {
  ...mockBookingUpcoming,
  id: 'bkg_story_long',
  session_type_name:
    'Advanced competition preparation & conditioning — full technical breakdown session',
  notes:
    'Would like to focus on closed-guard sweeps, grip fighting, and transitions to the back over the full session.',
};

/** Upcoming booking with no session type name + no notes — fallback label, minimal body. */
const mockBookingMinimal: Booking = {
  ...mockBookingUpcoming,
  id: 'bkg_story_minimal',
  session_type_name: undefined,
  notes: undefined,
};

const meta = {
  title: 'Components/Booking Card',
  component: BookingCard,
  args: {
    booking: mockBookingUpcoming,
    currentUserId: STUDENT_ID,
    canCancel: true,
    onCancel: () => {},
    onOpenRecording: () => {},
  },
  argTypes: {
    canCancel: { control: 'boolean' },
  },
} satisfies Meta<typeof BookingCard>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const States: Story = {
  render: () => (
    <View className="gap-3">
      {/* Status union: pending (upcoming), done, cancelled */}
      <BookingCard
        booking={mockBookingUpcoming}
        currentUserId={STUDENT_ID}
        canCancel
        onCancel={() => {}}
        onOpenRecording={() => {}}
      />
      <BookingCard
        booking={mockBookingPast}
        currentUserId={STUDENT_ID}
        canCancel={false}
        onCancel={() => {}}
        onOpenRecording={() => {}}
      />
      <BookingCard
        booking={mockBookingCancelled}
        currentUserId={STUDENT_ID}
        canCancel={false}
        onCancel={() => {}}
        onOpenRecording={() => {}}
      />

      {/* Recording pipeline status: ready (with open button), processing, failed */}
      <BookingCard
        booking={mockBookingRecordingReady}
        currentUserId={STUDENT_ID}
        canCancel={false}
        onCancel={() => {}}
        onOpenRecording={() => {}}
      />
      <BookingCard
        booking={mockBookingRecordingProcessing}
        currentUserId={STUDENT_ID}
        canCancel={false}
        onCancel={() => {}}
        onOpenRecording={() => {}}
      />
      <BookingCard
        booking={mockBookingRecordingFailed}
        currentUserId={STUDENT_ID}
        canCancel={false}
        onCancel={() => {}}
        onOpenRecording={() => {}}
      />

      {/* Join window: footer renders the Join button when onJoin is provided */}
      <BookingCard
        booking={mockBookingUpcoming}
        currentUserId={STUDENT_ID}
        canCancel
        onCancel={() => {}}
        onOpenRecording={() => {}}
        onJoin={() => {}}
      />

      {/* Expert viewpoint: counterpart resolves to the student */}
      <BookingCard
        booking={mockBookingUpcoming}
        currentUserId={mockBookingUpcoming.expert_id}
        canCancel
        onCancel={() => {}}
        onOpenRecording={() => {}}
      />

      {/* Long text: session type name + notes overflow/truncation */}
      <BookingCard
        booking={mockBookingLong}
        currentUserId={STUDENT_ID}
        canCancel
        onCancel={() => {}}
        onOpenRecording={() => {}}
      />

      {/* Minimal: no session type name (fallback label), no notes, no footer */}
      <BookingCard
        booking={mockBookingMinimal}
        currentUserId={STUDENT_ID}
        canCancel={false}
        onCancel={() => {}}
        onOpenRecording={() => {}}
      />
    </View>
  ),
};
