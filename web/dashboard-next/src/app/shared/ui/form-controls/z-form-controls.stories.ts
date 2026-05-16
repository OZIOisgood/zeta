import { FormsModule } from '@angular/forms';
import type { Meta, StoryObj } from '@storybook/angular';
import { moduleMetadata } from '@storybook/angular';
import { ZComboboxComponent } from '../combobox/z-combobox.component';
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
      imports: [FormsModule, ZComboboxComponent, ZTextInputComponent, ZTextareaComponent],
    }),
  ],
  render: () => ({
    props: {
      description: '',
      email: '',
      filled: 'Academy video review',
      group: '',
      groupOptions: GROUP_OPTIONS,
      title: '',
    },
    template: `
      <div class="grid max-w-2xl gap-6 bg-[var(--z-bg)] p-6 text-[var(--z-text)]">
        <section class="grid gap-4 rounded-lg border border-[var(--z-border)] bg-white p-5 shadow-sm">
          <h2 class="text-base font-semibold">Default form</h2>
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
            <z-combobox [options]="groupOptions" [value]="group" placeholder="Choose a group" />
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
      </div>
    `,
  }),
};

export default meta;

type Story = StoryObj;

export const Controls: Story = {};
