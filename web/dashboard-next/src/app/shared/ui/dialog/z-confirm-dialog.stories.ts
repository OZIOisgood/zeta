import { NgpDialogTrigger } from 'ng-primitives/dialog';
import type { Meta, StoryObj } from '@storybook/angular';
import { moduleMetadata } from '@storybook/angular';
import { ZButtonComponent } from '../button/z-button.component';
import { ZConfirmDialogComponent } from './z-confirm-dialog.component';

const meta: Meta<ZConfirmDialogComponent> = {
  title: 'UI/Confirm Dialog',
  component: ZConfirmDialogComponent,
  decorators: [
    moduleMetadata({
      imports: [NgpDialogTrigger, ZButtonComponent, ZConfirmDialogComponent],
    }),
  ],
  args: {
    title: 'Delete this item?',
    description: 'This action cannot be undone.',
    tone: 'danger',
    confirmLabel: 'Delete',
    cancelLabel: 'Cancel',
  },
  render: (args) => ({
    props: args,
    template: `
      <div class="grid min-h-80 place-items-center bg-[var(--z-bg)] p-6">
        <z-button [ngpDialogTrigger]="dialog">Open confirmation</z-button>

        <ng-template #dialog let-close="close">
          <z-confirm-dialog
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

type Story = StoryObj<ZConfirmDialogComponent>;

export const Danger: Story = {};

export const InfoOnly: Story = {
  args: {
    title: 'Nothing to review',
    description: 'All video parts must finish processing before this can be marked reviewed.',
    tone: 'info',
    confirmOnly: true,
    confirmLabel: 'Done',
    cancelLabel: '',
  },
};
