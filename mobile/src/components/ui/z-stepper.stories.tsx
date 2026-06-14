import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { ZStepper, type ZStep } from './z-stepper';

const defaultSteps: ZStep[] = [
  { label: 'Details', state: 'completed' },
  { label: 'Upload', state: 'completed' },
  { label: 'Review', state: 'active' },
  { label: 'Publish', state: 'upcoming' },
];

const meta = {
  title: 'UI/Stepper',
  component: ZStepper,
  args: { steps: defaultSteps, onStepPress: () => {} },
} satisfies Meta<typeof ZStepper>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const States: Story = {
  render: () => (
    <View className="gap-6">
      {/* Every step state: completed / active / upcoming */}
      <ZStepper
        steps={[
          { label: 'completed', state: 'completed' },
          { label: 'active', state: 'active' },
          { label: 'upcoming', state: 'upcoming' },
        ]}
        onStepPress={() => {}}
      />

      {/* First step active (start of flow) */}
      <ZStepper
        steps={[
          { label: 'Details', state: 'active' },
          { label: 'Upload', state: 'upcoming' },
          { label: 'Review', state: 'upcoming' },
        ]}
        onStepPress={() => {}}
      />

      {/* Last step active (end of flow, all prior completed) */}
      <ZStepper
        steps={[
          { label: 'Details', state: 'completed' },
          { label: 'Upload', state: 'completed' },
          { label: 'Publish', state: 'active' },
        ]}
        onStepPress={() => {}}
      />

      {/* All completed */}
      <ZStepper
        steps={[
          { label: 'Details', state: 'completed' },
          { label: 'Upload', state: 'completed' },
          { label: 'Done', state: 'completed' },
        ]}
        onStepPress={() => {}}
      />

      {/* Single step (minimal) */}
      <ZStepper steps={[{ label: 'Only step', state: 'active' }]} onStepPress={() => {}} />

      {/* Long-text overflow labels */}
      <ZStepper
        steps={[
          { label: 'Personal account details', state: 'completed' },
          { label: 'Upload your coaching video', state: 'active' },
          { label: 'Review and confirm submission', state: 'upcoming' },
        ]}
        onStepPress={() => {}}
      />

      {/* Many steps — horizontal scroll */}
      <ZStepper
        steps={[
          { label: 'One', state: 'completed' },
          { label: 'Two', state: 'completed' },
          { label: 'Three', state: 'completed' },
          { label: 'Four', state: 'active' },
          { label: 'Five', state: 'upcoming' },
          { label: 'Six', state: 'upcoming' },
          { label: 'Seven', state: 'upcoming' },
        ]}
        onStepPress={() => {}}
      />

      {/* Without onStepPress (optional callback omitted) */}
      <ZStepper steps={defaultSteps} />
    </View>
  ),
};
