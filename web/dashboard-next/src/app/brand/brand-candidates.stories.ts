import type { Meta, StoryObj } from '@storybook/angular';

const meta: Meta = {
  title: 'Brand/Candidates',
  render: () => ({
    template: `
      <div class="grid gap-6 bg-[var(--z-bg)] p-6 text-[var(--z-text)]">
        <section class="grid gap-3">
          <div>
            <h2 class="text-base font-semibold">Current Strido logo</h2>
            <p class="mt-1 text-sm text-[var(--z-muted)]">
              Production wordmark shared with the Strido landing page.
            </p>
          </div>
          <div
            class="grid h-32 w-64 place-items-center rounded-lg border border-[var(--z-border)] bg-white"
          >
            <img
              class="h-auto w-44"
              src="/assets/brand/strido/strido-logo.svg"
              alt="Strido logo"
            />
          </div>
        </section>

        <section class="grid gap-3">
          <div>
            <h2 class="text-base font-semibold">Logo candidate sheet</h2>
            <p class="mt-1 text-sm text-[var(--z-muted)]">
              Lighter preview of the original generated sheet. The original PNG remains in source assets.
            </p>
          </div>
          <img
            class="max-w-full rounded-lg border border-[var(--z-border)] bg-white"
            src="/assets/brand/candidates/logo-candidate-sheet-01-preview.webp"
            alt="Generated orange geometric horse-head logo candidate sheet"
          />
        </section>

        <section class="grid gap-3">
          <div>
            <h2 class="text-base font-semibold">Illustration candidate sheet</h2>
            <p class="mt-1 text-sm text-[var(--z-muted)]">
              Orange-white dashboard illustration candidates for future empty states and onboarding surfaces.
            </p>
          </div>
          <img
            class="max-w-full rounded-lg border border-[var(--z-border)] bg-white"
            src="/assets/illustrations/candidates/illustration-candidate-sheet-01-preview.webp"
            alt="Generated orange dashboard illustration candidate sheet"
          />
        </section>
      </div>
    `,
  }),
};

export default meta;

type Story = StoryObj;

export const GeneratedSheets: Story = {};
