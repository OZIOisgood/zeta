import type { Meta, StoryObj } from '@storybook/angular';
import { moduleMetadata } from '@storybook/angular';
import { ZSkeletonComponent } from './z-skeleton.component';

const meta: Meta<ZSkeletonComponent> = {
  title: 'Zeta UI/Skeleton',
  component: ZSkeletonComponent,
  decorators: [
    moduleMetadata({
      imports: [ZSkeletonComponent],
    }),
  ],
  render: () => ({
    template: `
      <div class="max-w-md space-y-3 bg-[var(--z-bg)] p-6">
        <z-skeleton class="block h-4 w-4/5"></z-skeleton>
        <z-skeleton class="block h-4 w-2/3"></z-skeleton>
        <z-skeleton class="block h-24 w-full"></z-skeleton>
      </div>
    `,
  }),
};

export default meta;

type Story = StoryObj<ZSkeletonComponent>;

export const CardLoading: Story = {};
