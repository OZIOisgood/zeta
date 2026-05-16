import type { Meta, StoryObj } from '@storybook/angular';
import { moduleMetadata } from '@storybook/angular';
import { ZToastComponent } from './z-toast.component';

const meta: Meta<ZToastComponent> = {
  title: 'Zeta UI/Toast',
  component: ZToastComponent,
  decorators: [
    moduleMetadata({
      imports: [ZToastComponent],
    }),
  ],
  args: {
    title: 'Brand direction saved',
    message: 'The first logo mark is noted as the preferred candidate for review.',
    closeLabel: 'Dismiss',
  },
  render: (args) => ({
    props: args,
    template: `
      <div class="max-w-sm bg-[var(--z-bg)] p-6">
        <z-toast [title]="title" [message]="message" [closeLabel]="closeLabel" />
      </div>
    `,
  }),
};

export default meta;

type Story = StoryObj<ZToastComponent>;

export const Default: Story = {};
