import type { Meta, StoryObj } from '@storybook/angular';
import { moduleMetadata } from '@storybook/angular';
import { ZBadgeComponent } from './z-badge.component';

const meta: Meta<ZBadgeComponent> = {
  title: 'Zeta UI/Badge',
  component: ZBadgeComponent,
  decorators: [
    moduleMetadata({
      imports: [ZBadgeComponent],
    }),
  ],
  args: {
    tone: 'neutral',
  },
  argTypes: {
    tone: {
      control: 'radio',
      options: ['neutral', 'primary', 'success', 'warning', 'danger'],
    },
  },
  render: (args) => ({
    props: args,
    template: `
      <div class="flex flex-wrap gap-2 bg-[var(--z-bg)] p-6">
        <z-badge [tone]="tone">Selected tone</z-badge>
        <z-badge tone="primary">To review</z-badge>
        <z-badge tone="success">Ready</z-badge>
        <z-badge tone="warning">Upcoming</z-badge>
        <z-badge tone="danger">Needs attention</z-badge>
      </div>
    `,
  }),
};

export default meta;

type Story = StoryObj<ZBadgeComponent>;

export const Playground: Story = {};
