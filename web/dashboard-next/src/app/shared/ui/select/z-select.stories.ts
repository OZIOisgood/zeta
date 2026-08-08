import type { Meta, StoryObj } from '@storybook/angular';
import { moduleMetadata } from '@storybook/angular';
import { ZSelectComponent } from './z-select.component';

const SAMPLE_OPTIONS = [
  { value: 'academy', label: 'Academy Group' },
  { value: 'advanced', label: 'Advanced Training' },
  { value: 'beginners', label: 'Beginners Class' },
  { value: 'intermediate', label: 'Intermediate Level' },
  { value: 'elite', label: 'Elite Squad' },
];

const meta: Meta<ZSelectComponent> = {
  title: 'UI/Select',
  component: ZSelectComponent,
  decorators: [
    moduleMetadata({
      imports: [ZSelectComponent],
    }),
  ],
  args: {
    options: SAMPLE_OPTIONS,
    placeholder: 'Select a group',
    value: undefined,
    disabled: false,
    tone: 'light',
  },
  render: (args) => ({
    props: args,
    template: `
      <div class="max-w-sm bg-[var(--z-bg)] p-6">
        <z-select
          [options]="options"
          [placeholder]="placeholder"
          [value]="value"
          [disabled]="disabled"
          [tone]="tone"
        />
      </div>
    `,
  }),
};

export default meta;
type Story = StoryObj<ZSelectComponent>;

export const Default: Story = {};

export const WithSelection: Story = {
  args: {
    value: 'academy',
  },
};

export const ManyOptions: Story = {
  args: {
    options: [
      ...SAMPLE_OPTIONS,
      { value: 'pro', label: 'Pro Athletes' },
      { value: 'youth', label: 'Youth Program' },
      { value: 'masters', label: 'Masters League' },
      { value: 'junior', label: 'Junior Circuit' },
    ],
    placeholder: 'Choose a training group',
  },
};

export const NoOptions: Story = {
  args: {
    options: [],
    placeholder: 'No groups available',
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
  },
};

export const Dark: Story = {
  args: {
    value: 'academy',
    tone: 'dark',
  },
  render: (args) => ({
    props: args,
    template: `
      <div class="max-w-sm bg-stone-950 p-6">
        <z-select
          [options]="options"
          [placeholder]="placeholder"
          [value]="value"
          [disabled]="disabled"
          [tone]="tone"
        />
      </div>
    `,
  }),
};
