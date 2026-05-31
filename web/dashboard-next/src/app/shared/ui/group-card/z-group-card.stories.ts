import type { Meta, StoryObj } from '@storybook/angular';
import { moduleMetadata } from '@storybook/angular';
import { ZGroupCardComponent } from './z-group-card.component';

const meta: Meta<ZGroupCardComponent> = {
  title: 'UI/Group Card',
  component: ZGroupCardComponent,
  decorators: [
    moduleMetadata({
      imports: [ZGroupCardComponent],
    }),
  ],
  args: {
    group: {
      id: 'group-1',
      name: 'Arena Academy',
      owner_id: 'user-1',
      avatar: null,
      description:
        'Weekly training sessions, student submissions, and coaching notes for the academy team.',
      created_at: '2026-05-31T00:00:00Z',
      updated_at: '2026-05-31T00:00:00Z',
    },
    noDescription: 'No description was added for this group.',
  },
  render: (args) => ({
    props: args,
    template: `
      <div class="max-w-sm bg-[var(--z-bg)] p-6">
        <div class="rounded-lg border border-[var(--z-border)] bg-white p-4 shadow-sm">
          <z-group-card [group]="group" [noDescription]="noDescription" />
        </div>
      </div>
    `,
  }),
};

export default meta;

type Story = StoryObj<ZGroupCardComponent>;

export const Default: Story = {};
