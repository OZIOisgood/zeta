import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { FirstStepRow } from './first-step-row';

// No onboarding-step fixture exists in __stories__/fixtures.ts, so the
// representative + edge-case rows are defined locally here (do NOT edit fixtures.ts).
const incompleteStep = {
  label: 'Upload your first video',
  description: 'Share a clip and get feedback from your coach.',
};

const completedStep = {
  label: 'Join a group',
  description: 'You are part of Brazilian Jiu-Jitsu.',
};

const longTextStep = {
  label: 'Set up your coaching availability for the upcoming competition season',
  description:
    'Define weekly time slots so students can book technique reviews and live sessions with you — a deliberately long description used to verify wrapping behavior.',
};

const meta = {
  title: 'Components/First Step Row',
  component: FirstStepRow,
  args: {
    label: incompleteStep.label,
    description: incompleteStep.description,
    completed: false,
    onPress: () => {},
  },
  argTypes: {
    completed: { control: 'boolean' },
  },
} satisfies Meta<typeof FirstStepRow>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const States: Story = {
  render: () => (
    <View className="gap-3">
      <FirstStepRow
        label={incompleteStep.label}
        description={incompleteStep.description}
        completed={false}
        onPress={() => {}}
      />
      <FirstStepRow
        label={completedStep.label}
        description={completedStep.description}
        completed
        onPress={() => {}}
      />
      <FirstStepRow
        label={longTextStep.label}
        description={longTextStep.description}
        completed={false}
        onPress={() => {}}
      />
      <FirstStepRow
        label={longTextStep.label}
        description={longTextStep.description}
        completed
        onPress={() => {}}
      />
    </View>
  ),
};
