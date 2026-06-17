import type { Meta, StoryObj } from '@storybook/angular';
import { ZDropdownMenuComponent, ZDropdownMenuItem } from './z-dropdown-menu.component';

const legalItems: ZDropdownMenuItem[] = [
  {
    id: 'imprint',
    label: 'Imprint',
    href: 'https://strido.net/en/imprint.html',
    icon: 'file-text',
  },
  { id: 'privacy', label: 'Privacy', href: 'https://strido.net/en/privacy.html', icon: 'shield' },
  {
    id: 'terms',
    label: 'Terms of Use',
    href: 'https://strido.net/en/terms.html',
    icon: 'file-text',
  },
  { id: 'contact', label: 'Contact', href: 'https://strido.net/en/contact.html', icon: 'mail' },
];

const meta: Meta<ZDropdownMenuComponent> = {
  title: 'UI/Dropdown Menu',
  component: ZDropdownMenuComponent,
  args: {
    label: 'Help',
    items: legalItems,
    placement: 'bottom-start',
    triggerIcon: 'help',
    triggerClass: 'text-[var(--z-muted)]',
    menuClass: 'w-56',
    showExternalIcon: true,
  },
  argTypes: {
    placement: {
      control: 'radio',
      options: ['bottom-start', 'top-start', 'bottom-end', 'top-end'],
    },
    triggerIcon: {
      control: 'radio',
      options: ['help', 'file-text', 'mail', 'shield'],
    },
  },
  render: (args) => ({
    props: args,
    template: `
      <div class="w-64 bg-white p-4">
        <z-dropdown-menu
          [label]="label"
          [items]="items"
          [placement]="placement"
          [triggerIcon]="triggerIcon"
          [triggerClass]="triggerClass"
          [menuClass]="menuClass"
          [showExternalIcon]="showExternalIcon"
        />
      </div>
    `,
  }),
};

export default meta;

type Story = StoryObj<ZDropdownMenuComponent>;

export const Playground: Story = {};

export const SidebarBottom: Story = {
  args: {
    placement: 'bottom-start',
  },
  render: (args) => ({
    props: args,
    template: `
      <div class="flex h-[28rem] w-64 flex-col border border-[var(--z-border)] bg-white p-4">
        <div class="space-y-1">
          <div class="h-10 rounded-md bg-[var(--z-surface-warm)]"></div>
          <div class="h-10 rounded-md bg-[var(--z-surface-warm)]"></div>
          <div class="h-10 rounded-md bg-[var(--z-surface-warm)]"></div>
        </div>
        <div class="mt-auto border-t border-[var(--z-border)] pt-3">
          <z-dropdown-menu
            [label]="label"
            [items]="items"
            [placement]="placement"
            [triggerIcon]="triggerIcon"
            [triggerClass]="triggerClass"
            [menuClass]="menuClass"
            [showExternalIcon]="showExternalIcon"
          />
        </div>
      </div>
    `,
  }),
};
