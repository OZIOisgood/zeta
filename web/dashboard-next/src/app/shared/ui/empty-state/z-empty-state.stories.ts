import type { Meta, StoryObj } from '@storybook/angular';
import { moduleMetadata } from '@storybook/angular';
import { ZButtonComponent } from '../button/z-button.component';
import { ZEmptyStateComponent } from './z-empty-state.component';

const meta: Meta<ZEmptyStateComponent> = {
  title: 'Zeta UI/Empty State',
  component: ZEmptyStateComponent,
  decorators: [
    moduleMetadata({
      imports: [ZButtonComponent, ZEmptyStateComponent],
    }),
  ],
  args: {
    title: 'No urgent messages',
    description: 'Conversation and review alerts will land here once live data is connected.',
  },
  render: (args) => ({
    props: args,
    template: `
      <div class="max-w-md bg-[var(--z-bg)] p-6">
        <z-empty-state [title]="title" [description]="description">
          <z-button variant="secondary" size="sm">View inbox</z-button>
        </z-empty-state>
      </div>
    `,
  }),
};

export default meta;

type Story = StoryObj<ZEmptyStateComponent>;

export const Default: Story = {};
