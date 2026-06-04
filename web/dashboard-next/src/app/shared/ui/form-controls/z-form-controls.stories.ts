import { FormsModule } from '@angular/forms';
import type { Meta, StoryObj } from '@storybook/angular';
import { moduleMetadata } from '@storybook/angular';
import { ZAvatarInputComponent } from '../avatar-input/z-avatar-input.component';
import { ZCheckboxComponent } from '../checkbox/z-checkbox.component';
import { ZComboboxComponent } from '../combobox/z-combobox.component';
import { ZSelectComponent } from '../select/z-select.component';
import { ZTextInputComponent } from '../text-input/z-text-input.component';
import { ZTextareaComponent } from '../textarea/z-textarea.component';

const GROUP_OPTIONS = [
  { value: 'academy', label: 'Academy Group' },
  { value: 'advanced', label: 'Advanced Training' },
  { value: 'beginners', label: 'Beginners Class' },
];

const meta: Meta = {
  title: 'UI/Form Controls',
  decorators: [
    moduleMetadata({
      imports: [
        FormsModule,
        ZAvatarInputComponent,
        ZCheckboxComponent,
        ZComboboxComponent,
        ZSelectComponent,
        ZTextInputComponent,
        ZTextareaComponent,
      ],
    }),
  ],
  render: () => ({
    props: {
      description: '',
      avatar: null,
      email: '',
      filled: 'Academy video review',
      group: '',
      groupOptions: GROUP_OPTIONS,
      notifications: true,
      title: '',
    },
    template: `
      <div class="grid max-w-2xl gap-6 bg-[var(--z-bg)] p-6 text-[var(--z-text)]">
        <section class="grid gap-4 rounded-lg border border-[var(--z-border)] bg-white p-5 shadow-sm">
          <h2 class="text-base font-semibold">Default form</h2>
          <z-avatar-input
            [(ngModel)]="avatar"
            label="Avatar"
            helperTitle="Group image"
            helperText="Upload a square image. It will be compressed before saving."
            [required]="true"
          />
          <label class="grid gap-2">
            <span class="text-sm font-semibold">Title</span>
            <z-text-input [(ngModel)]="title" placeholder="e.g. Jump line take 2" />
          </label>
          <label class="grid gap-2">
            <span class="text-sm font-semibold">Description</span>
            <z-textarea [(ngModel)]="description" placeholder="Add context, goals, or notes for the reviewer." />
          </label>
          <label class="grid gap-2">
            <span class="text-sm font-semibold">Group</span>
            <z-select [options]="groupOptions" [value]="group" placeholder="Choose a group" />
          </label>
        </section>

        <section class="grid gap-4 rounded-lg border border-[var(--z-border)] bg-white p-5 shadow-sm">
          <h2 class="text-base font-semibold">Angular Primitives controls</h2>
          <label class="grid gap-2">
            <span class="text-sm font-semibold">Select-like combobox</span>
            <z-combobox
              [options]="groupOptions"
              [value]="group"
              label="Search groups"
              placeholder="Search groups"
              toggleLabel="Toggle group options"
              (valueChange)="group = $event"
            />
          </label>
          <label class="flex items-center gap-3">
            <z-checkbox
              label="Notification emails"
              [checked]="notifications"
              (checkedChange)="notifications = $event"
            />
            <span class="text-sm font-semibold">Notification emails</span>
          </label>
        </section>

        <section class="grid gap-4 rounded-lg border border-[var(--z-border)] bg-white p-5 shadow-sm">
          <h2 class="text-base font-semibold">States</h2>
          <label class="grid gap-2">
            <span class="text-sm font-semibold">Filled</span>
            <z-text-input [(ngModel)]="filled" placeholder="Title" />
          </label>
          <label class="grid gap-2">
            <span class="text-sm font-semibold">Invalid</span>
            <z-text-input placeholder="Required title" [invalid]="true" />
            <span class="text-xs text-rose-700">Title is required.</span>
          </label>
          <label class="grid gap-2">
            <span class="text-sm font-semibold">Disabled</span>
            <z-text-input placeholder="Disabled input" [disabled]="true" />
          </label>
          <label class="grid gap-2">
            <span class="text-sm font-semibold">Email</span>
            <z-text-input [(ngModel)]="email" type="email" placeholder="name@example.com" autocomplete="email" />
          </label>
        </section>

        <section class="grid gap-4 rounded-lg border border-[var(--z-border)] bg-white p-5 shadow-sm">
          <h2 class="text-base font-semibold">Auto-resizing textarea</h2>
          <label class="grid gap-2">
            <span class="text-sm font-semibold">Comment</span>
            <z-textarea
              [(ngModel)]="description"
              [autoResize]="true"
              [maxRows]="6"
              [rows]="1"
              placeholder="Add timestamped feedback."
            />
          </label>
        </section>
      </div>
    `,
  }),
};

export default meta;

type Story = StoryObj;

export const Controls: Story = {};
