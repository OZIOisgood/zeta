import type { Meta, StoryObj } from '@storybook/angular';

const meta: Meta = {
  title: 'Brand/Logo System',
  render: () => ({
    template: `
      <div class="grid gap-6 bg-[var(--z-bg)] p-6 text-[var(--z-text)]">
        <section class="grid gap-4">
          <div>
            <h2 class="text-base font-semibold">Strido logo system</h2>
            <p class="mt-1 text-sm text-[var(--z-muted)]">
              Approved orange, dark, and light palette across the horse mark, play mark, and wordmark.
            </p>
          </div>
          <div class="grid gap-4 lg:grid-cols-2">
            <div class="grid grid-cols-3 gap-3 rounded-xl bg-[#d8cdc0] p-5">
              <img src="/assets/brand/strido/strido-horse-mark-orange.svg" alt="Orange Strido horse mark" />
              <img src="/assets/brand/strido/strido-horse-mark-dark.svg" alt="Dark Strido horse mark" />
              <img src="/assets/brand/strido/strido-horse-mark-light.svg" alt="Light Strido horse mark" />
            </div>
            <div class="grid grid-cols-2 gap-3 rounded-xl bg-[#d8cdc0] p-5">
              <img src="/assets/brand/strido/strido-play-mark-dark.svg" alt="Dark Strido play mark" />
              <img src="/assets/brand/strido/strido-play-mark-light.svg" alt="Light Strido play mark" />
            </div>
            <div class="grid min-h-32 place-items-center rounded-xl bg-[#fbf3e8] p-8">
              <img
                class="w-full max-w-xs"
                src="/assets/brand/strido/strido-logo-dark.svg"
                alt="Dark Strido wordmark"
              />
            </div>
            <div class="grid min-h-32 place-items-center rounded-xl bg-[#271910] p-8">
              <img
                class="w-full max-w-xs"
                src="/assets/brand/strido/strido-logo-light.svg"
                alt="Light Strido wordmark"
              />
            </div>
          </div>
        </section>
      </div>
    `,
  }),
};

export default meta;

type Story = StoryObj;

export const LogoSystem: Story = {};
