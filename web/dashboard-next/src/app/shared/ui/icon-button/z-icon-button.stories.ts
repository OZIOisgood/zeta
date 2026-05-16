import type { Meta, StoryObj } from '@storybook/angular';
import { moduleMetadata } from '@storybook/angular';
import { LucideBell, LucideMenu, LucideSearch } from '@lucide/angular';
import { ZIconButtonComponent } from './z-icon-button.component';

const meta: Meta<ZIconButtonComponent> = {
  title: 'Zeta UI/Icon Button',
  component: ZIconButtonComponent,
  decorators: [
    moduleMetadata({
      imports: [LucideBell, LucideMenu, LucideSearch, ZIconButtonComponent],
    }),
  ],
  args: {
    label: 'Search',
    variant: 'ghost',
    size: 'md',
    disabled: false,
  },
  argTypes: {
    variant: {
      control: 'radio',
      options: ['primary', 'secondary', 'ghost'],
    },
    size: {
      control: 'radio',
      options: ['sm', 'md'],
    },
  },
  render: (args) => ({
    props: args,
    template: `
      <div class="flex flex-wrap items-center gap-3 bg-[var(--z-bg)] p-6">
        <z-icon-button [label]="label" [variant]="variant" [size]="size" [disabled]="disabled">
          <svg lucideSearch class="size-5" aria-hidden="true"></svg>
        </z-icon-button>
        <z-icon-button label="Open navigation" variant="secondary" [size]="size">
          <svg lucideMenu class="size-5" aria-hidden="true"></svg>
        </z-icon-button>
        <z-icon-button label="Notifications" variant="primary" [size]="size">
          <svg lucideBell class="size-5" aria-hidden="true"></svg>
        </z-icon-button>
      </div>
    `,
  }),
};

export default meta;

type Story = StoryObj<ZIconButtonComponent>;

export const Playground: Story = {};
