import { NgpDialogTrigger } from 'ng-primitives/dialog';
import { LucideUserPlus } from '@lucide/angular';
import type { Meta, StoryObj } from '@storybook/angular';
import { moduleMetadata } from '@storybook/angular';
import { ZAvatarComponent } from '../avatar/z-avatar.component';
import { ZButtonComponent } from '../button/z-button.component';
import { ZActionDialogComponent } from './z-action-dialog.component';

const meta: Meta<ZActionDialogComponent> = {
  title: 'UI/Action Dialog',
  component: ZActionDialogComponent,
  decorators: [
    moduleMetadata({
      imports: [
        NgpDialogTrigger,
        ZActionDialogComponent,
        ZAvatarComponent,
        ZButtonComponent,
        LucideUserPlus,
      ],
    }),
  ],
  args: {
    title: 'Join Gamma?',
    description: 'You have been invited to join Gamma.',
    tone: 'info',
    showToneIcon: false,
    hasProjectedMedia: true,
    confirmLabel: 'Join Group',
    cancelLabel: 'Cancel',
  },
  render: (args) => ({
    props: args,
    template: `
      <div class="grid min-h-80 place-items-center bg-[var(--z-bg)] p-6">
        <z-button [ngpDialogTrigger]="dialog">Open dialog</z-button>

        <ng-template #dialog let-close="close">
          <z-action-dialog
            [title]="title"
            [description]="description"
            [tone]="tone"
            [showToneIcon]="showToneIcon"
            [hasProjectedMedia]="hasProjectedMedia"
            [confirmLabel]="confirmLabel"
            [cancelLabel]="cancelLabel"
            [close]="close"
          >
            <z-avatar z-dialog-media class="size-12" fallback="G" alt="Gamma" />
            <svg z-dialog-confirm-icon lucideUserPlus class="size-4" aria-hidden="true"></svg>
          </z-action-dialog>
        </ng-template>
      </div>
    `,
  }),
};

export default meta;

type Story = StoryObj<ZActionDialogComponent>;

export const Invite: Story = {};

export const Warning: Story = {
  args: {
    title: 'Mark video as reviewed?',
    description: 'After this, no comments can be added, edited, or deleted.',
    tone: 'warning',
    showToneIcon: true,
    hasProjectedMedia: false,
    confirmLabel: 'Mark as Reviewed',
  },
};
