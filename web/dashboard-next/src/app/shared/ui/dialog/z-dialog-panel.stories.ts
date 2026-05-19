import { NgpDialogTrigger } from 'ng-primitives/dialog';
import type { Meta, StoryObj } from '@storybook/angular';
import { moduleMetadata } from '@storybook/angular';
import { ZButtonComponent } from '../button/z-button.component';
import { ZDialogPanelComponent } from './z-dialog-panel.component';

const meta: Meta<ZDialogPanelComponent> = {
  title: 'UI/Dialog Panel',
  component: ZDialogPanelComponent,
  decorators: [
    moduleMetadata({
      imports: [NgpDialogTrigger, ZButtonComponent, ZDialogPanelComponent],
    }),
  ],
  args: {
    title: 'Delete comment?',
    description: 'This comment will be removed from the video. This action cannot be undone.',
    tone: 'danger',
    confirmLabel: 'Delete',
    cancelLabel: 'Cancel',
    confirmOnly: false,
  },
  argTypes: {
    tone: {
      control: 'radio',
      options: ['danger', 'warning', 'info'],
    },
  },
  render: (args) => ({
    props: args,
    template: `
      <div class="grid min-h-80 place-items-center bg-[var(--z-bg)] p-6">
        <z-button [ngpDialogTrigger]="dialog">Open dialog</z-button>

        <ng-template #dialog let-close="close">
          <z-dialog-panel
            [title]="title"
            [description]="description"
            [tone]="tone"
            [confirmLabel]="confirmLabel"
            [cancelLabel]="cancelLabel"
            [confirmOnly]="confirmOnly"
            [close]="close"
          />
        </ng-template>
      </div>
    `,
  }),
};

export default meta;

type Story = StoryObj<ZDialogPanelComponent>;

export const Destructive: Story = {};

export const Warning: Story = {
  args: {
    title: 'Mark video as reviewed?',
    description: 'After this, no comments can be added, edited, or deleted.',
    tone: 'warning',
    confirmLabel: 'Mark as Reviewed',
  },
};

export const Info: Story = {
  args: {
    title: 'Cannot mark as reviewed',
    description: 'Every video part needs at least one comment before finalizing.',
    tone: 'info',
    confirmLabel: 'Done',
    confirmOnly: true,
  },
};
