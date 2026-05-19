import type { Meta, StoryObj } from '@storybook/angular';
import { moduleMetadata } from '@storybook/angular';
import { ZButtonComponent } from './z-button.component';

const meta: Meta<ZButtonComponent> = {
  title: 'UI/Button',
  component: ZButtonComponent,
  decorators: [
    moduleMetadata({
      imports: [ZButtonComponent],
    }),
  ],
  args: {
    variant: 'primary',
    size: 'md',
    disabled: false,
  },
  argTypes: {
    variant: {
      control: 'radio',
      options: ['primary', 'secondary', 'ghost', 'danger'],
    },
    size: {
      control: 'radio',
      options: ['sm', 'md'],
    },
  },
  render: (args) => ({
    props: args,
    template: `
      <div class="flex flex-wrap gap-3 bg-[var(--z-bg)] p-6">
        <z-button [variant]="variant" [size]="size" [disabled]="disabled">
          Upload video
        </z-button>
        <z-button variant="secondary" [size]="size">Manage group</z-button>
        <z-button variant="ghost" [size]="size">View sessions</z-button>
        <z-button variant="danger" [size]="size">Delete comment</z-button>
      </div>
    `,
  }),
};

export default meta;

type Story = StoryObj<ZButtonComponent>;

export const Playground: Story = {};

export const Disabled: Story = {
  args: {
    disabled: true,
  },
};
