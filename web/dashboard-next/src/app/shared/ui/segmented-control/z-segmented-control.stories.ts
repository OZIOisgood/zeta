import type { Meta, StoryObj } from '@storybook/angular';
import { moduleMetadata } from '@storybook/angular';
import { ZSegmentedControlComponent } from './z-segmented-control.component';

const meta: Meta<ZSegmentedControlComponent> = {
  title: 'Zeta UI/Segmented Control',
  component: ZSegmentedControlComponent,
  decorators: [
    moduleMetadata({
      imports: [ZSegmentedControlComponent],
    }),
  ],
  args: {
    label: 'Language',
    value: 'en',
    options: [
      { value: 'en', label: 'EN' },
      { value: 'preview', label: 'Preview' },
    ],
  },
  render: (args) => ({
    props: args,
    template: `
      <div class="bg-[var(--z-bg)] p-6">
        <z-segmented-control [label]="label" [value]="value" [options]="options" />
      </div>
    `,
  }),
};

export default meta;

type Story = StoryObj<ZSegmentedControlComponent>;

export const Language: Story = {};
