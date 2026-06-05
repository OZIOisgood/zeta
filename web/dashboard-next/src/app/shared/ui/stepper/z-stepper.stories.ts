import type { Meta, StoryObj } from '@storybook/angular';
import { moduleMetadata } from '@storybook/angular';
import { ZStepperComponent, type StepperStep } from './z-stepper.component';

const uploadSteps = (activeIndex: 0 | 1 | 2): StepperStep[] => [
  {
    label: 'Select Video',
    state: activeIndex > 0 ? 'completed' : activeIndex === 0 ? 'active' : 'upcoming',
  },
  {
    label: 'Enter Details',
    state: activeIndex > 1 ? 'completed' : activeIndex === 1 ? 'active' : 'upcoming',
  },
  {
    label: 'Upload',
    state: activeIndex === 2 ? 'active' : 'upcoming',
  },
];

const bookingSteps = (activeIndex: 0 | 1 | 2 | 3 | 4): StepperStep[] =>
  ['Select Group', 'Select Expert', 'Session Type', 'Select Time', 'Confirm'].map(
    (label, index): StepperStep => ({
      label,
      state: index < activeIndex ? 'completed' : index === activeIndex ? 'active' : 'upcoming',
    }),
  );

const meta: Meta<ZStepperComponent> = {
  title: 'UI/Stepper',
  component: ZStepperComponent,
  decorators: [moduleMetadata({ imports: [ZStepperComponent] })],
  argTypes: {
    stepClick: { action: 'stepClick' },
  },
  render: (args) => ({
    props: args,
    template: `
      <div class="max-w-sm bg-[var(--z-bg)] p-6">
        <z-stepper [steps]="steps" [label]="label" (stepClick)="stepClick($event)" />
      </div>
    `,
  }),
};

export default meta;

type Story = StoryObj<ZStepperComponent>;

export const Step1Active: Story = {
  name: 'Step 1 — active',
  args: { steps: uploadSteps(0) },
};

export const Step2Active: Story = {
  name: 'Step 2 — active (step 1 completed)',
  args: { steps: uploadSteps(1) },
};

export const Step3Active: Story = {
  name: 'Step 3 — active (steps 1 & 2 completed)',
  args: { steps: uploadSteps(2) },
};

export const MobileBookingFlow: Story = {
  args: { steps: bookingSteps(3) },
  render: (args) => ({
    props: args,
    template: `
      <div class="w-72 bg-[var(--z-bg)] p-4">
        <z-stepper [steps]="steps" [label]="label" (stepClick)="stepClick($event)" />
      </div>
    `,
  }),
};
