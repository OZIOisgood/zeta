import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import type { CoachingAvailability } from '../api/queries/coaching';
import { mockAvailability } from './__stories__/fixtures';
import { ScheduleDayRow } from './schedule-day-row';

const meta = {
  title: 'Components/Schedule Day Row',
  component: ScheduleDayRow,
  args: {
    availability: mockAvailability,
    dayName: 'Monday',
    editLabel: 'Edit availability',
    deleteLabel: 'Delete availability',
    onEdit: () => {},
    onDelete: () => {},
  },
} satisfies Meta<typeof ScheduleDayRow>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

/** Edge case: full-day window so the time range reads differently. */
const mockAvailabilityFullDay: CoachingAvailability = {
  ...mockAvailability,
  id: 'avl_01HZX0000000000000000000B',
  day_of_week: 6,
  start_time: '06:30',
  end_time: '22:00',
};

export const States: Story = {
  render: (args) => (
    <View className="gap-3">
      {/* Representative: short weekday + morning window. */}
      <ScheduleDayRow {...args} dayName="Monday" availability={mockAvailability} />
      {/* Edge: long day-name label exercises the min-w-0/flex-1 truncation. */}
      <ScheduleDayRow
        {...args}
        dayName="Wednesday (Advanced competition cohort — extended evening block)"
        availability={mockAvailability}
      />
      {/* Edge: wide full-day window with an alternate weekday. */}
      <ScheduleDayRow {...args} dayName="Saturday" availability={mockAvailabilityFullDay} />
    </View>
  ),
};
