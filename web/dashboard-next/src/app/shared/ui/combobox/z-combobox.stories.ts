import type { Meta, StoryObj } from '@storybook/angular';
import { moduleMetadata } from '@storybook/angular';
import { ZComboboxComponent } from './z-combobox.component';

const SAMPLE_OPTIONS = [
  { value: 'academy', label: 'Academy Group' },
  { value: 'advanced', label: 'Advanced Training' },
  { value: 'beginners', label: 'Beginners Class' },
  { value: 'intermediate', label: 'Intermediate Level' },
  { value: 'elite', label: 'Elite Squad' },
];

const meta: Meta<ZComboboxComponent> = {
  title: 'UI/Combobox',
  component: ZComboboxComponent,
  decorators: [
    moduleMetadata({
      imports: [ZComboboxComponent],
    }),
  ],
  args: {
    options: SAMPLE_OPTIONS,
    placeholder: 'Select a group',
    value: undefined,
  },
  render: (args) => ({
    props: args,
    template: `
      <div class="max-w-sm bg-[var(--z-bg)] p-6">
        <z-combobox [options]="options" [placeholder]="placeholder" [value]="value" />
      </div>
    `,
  }),
};

export default meta;
type Story = StoryObj<ZComboboxComponent>;

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
