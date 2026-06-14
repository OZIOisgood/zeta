import { FormsModule } from '@angular/forms';
import type { Meta, StoryObj } from '@storybook/angular';
import { moduleMetadata } from '@storybook/angular';
import { ZOtpInputComponent } from './z-otp-input.component';

const meta: Meta<ZOtpInputComponent> = {
  title: 'UI/OTP Input',
  component: ZOtpInputComponent,
  decorators: [
    moduleMetadata({
      imports: [FormsModule, ZOtpInputComponent],
    }),
  ],
  render: (args) => ({
    props: { ...args, code: '' },
    template: `
      <div class="grid max-w-md gap-2 bg-[var(--z-bg)] p-6 text-[var(--z-text)]">
        <span class="text-sm font-semibold">Invite code</span>
        <z-otp-input
          [(ngModel)]="code"
          [length]="length"
          [invalid]="invalid"
          [disabled]="disabled"
        />
      </div>
    `,
  }),
  args: {
    length: 8,
    invalid: false,
    disabled: false,
  },
};

export default meta;

type Story = StoryObj<ZOtpInputComponent>;

export const Default: Story = {};

export const Filled: Story = {
  render: (args) => ({
    props: { ...args, code: 'ABC12345' },
    template: `
      <div class="grid max-w-md gap-2 bg-[var(--z-bg)] p-6 text-[var(--z-text)]">
        <span class="text-sm font-semibold">Invite code</span>
        <z-otp-input
          [(ngModel)]="code"
          [length]="length"
          [invalid]="invalid"
          [disabled]="disabled"
        />
      </div>
    `,
  }),
};

export const Invalid: Story = {
  render: (args) => ({
    props: { ...args, code: 'ABC12345', invalid: true },
    template: `
      <div class="grid max-w-md gap-2 bg-[var(--z-bg)] p-6 text-[var(--z-text)]">
        <span class="text-sm font-semibold">Invite code</span>
        <z-otp-input
          [(ngModel)]="code"
          [length]="length"
          [invalid]="invalid"
          [disabled]="disabled"
        />
        <span class="text-xs text-rose-700">That code is invalid or has already been used.</span>
      </div>
    `,
  }),
};

export const Disabled: Story = {
  render: (args) => ({
    props: { ...args, code: 'ABC12345', disabled: true },
    template: `
      <div class="grid max-w-md gap-2 bg-[var(--z-bg)] p-6 text-[var(--z-text)]">
        <span class="text-sm font-semibold">Invite code</span>
        <z-otp-input
          [(ngModel)]="code"
          [length]="length"
          [invalid]="invalid"
          [disabled]="disabled"
        />
      </div>
    `,
  }),
};
