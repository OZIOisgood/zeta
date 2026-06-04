import type { Meta, StoryObj } from '@storybook/angular';
import { moduleMetadata } from '@storybook/angular';
import { ZAvatarComponent } from './z-avatar.component';

const meta: Meta<ZAvatarComponent> = {
  title: 'UI/Avatar',
  component: ZAvatarComponent,
  decorators: [
    moduleMetadata({
      imports: [ZAvatarComponent],
    }),
  ],
  args: {
    fallback: 'AC',
    alt: 'Ada Coach',
  },
  render: (args) => ({
    props: args,
    template: `
      <div class="flex items-center gap-3 bg-[var(--z-bg)] p-6">
        <z-avatar class="size-10" [image]="image" [fallback]="fallback" [alt]="alt" />
        <div>
          <p class="text-sm font-semibold">Ada Coach</p>
          <p class="mt-1 text-xs text-[var(--z-muted)]">ada@example.com</p>
        </div>
      </div>
    `,
  }),
};

export default meta;

type Story = StoryObj<ZAvatarComponent>;

export const Fallback: Story = {};
