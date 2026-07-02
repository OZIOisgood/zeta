import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import type { SessionType } from '../api/queries/coaching';
import { SessionTypeRow } from './session-type-row';
import { mockSessionType } from './__stories__/fixtures';

// Edge cases derived from the representative fixture. `description` is a required
// string on SessionType, so the "no description" case is an empty string (the
// component hides the paragraph when falsy).
const sessionTypeNoDescription: SessionType = {
  ...mockSessionType,
  id: 'stp_01HZX0000000000000000000B',
  name: 'Quick check-in',
  description: '',
  duration_minutes: 15,
};

const sessionTypeLong: SessionType = {
  ...mockSessionType,
  id: 'stp_01HZX0000000000000000000C',
  name: 'Advanced competition preparation & strategy debrief — full game-plan review session',
  description:
    'Advanced footwork, balance, and tempo control for competitive sparring — a deliberately long description used to verify wrapping and truncation behavior in the composite row, including how the duration badge and action buttons hold their position.',
  duration_minutes: 90,
};

const meta = {
  title: 'Components/Session Type Row',
  component: SessionTypeRow,
  args: {
    sessionType: mockSessionType,
    durationLabel: '45 min',
    editLabel: 'Edit',
    deleteLabel: 'Delete',
    onEdit: () => {},
    onDelete: () => {},
  },
} satisfies Meta<typeof SessionTypeRow>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const States: Story = {
  render: () => (
    <View className="gap-3">
      {/* Representative: name + duration badge + short description */}
      <SessionTypeRow
        sessionType={mockSessionType}
        durationLabel="45 min"
        editLabel="Edit"
        deleteLabel="Delete"
        onEdit={() => {}}
        onDelete={() => {}}
      />
      {/* Without optional field: empty description hides the paragraph */}
      <SessionTypeRow
        sessionType={sessionTypeNoDescription}
        durationLabel="15 min"
        editLabel="Edit"
        deleteLabel="Delete"
        onEdit={() => {}}
        onDelete={() => {}}
      />
      {/* Long-text overflow: long name wraps, long description truncates at 3 lines */}
      <SessionTypeRow
        sessionType={sessionTypeLong}
        durationLabel="1 h 30 min"
        editLabel="Edit"
        deleteLabel="Delete"
        onEdit={() => {}}
        onDelete={() => {}}
      />
    </View>
  ),
};
