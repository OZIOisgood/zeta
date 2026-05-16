import {
  LucideCheck,
  LucideFileVideo,
  LucideUpload,
  LucideUsers,
  LucideVideo,
} from '@lucide/angular';
import type { Meta, StoryObj } from '@storybook/angular';
import { moduleMetadata } from '@storybook/angular';
import { ZBadgeComponent } from '../shared/ui/badge/z-badge.component';
import { ZButtonComponent } from '../shared/ui/button/z-button.component';
import { ZComboboxComponent } from '../shared/ui/combobox/z-combobox.component';
import { ZEmptyStateComponent } from '../shared/ui/empty-state/z-empty-state.component';
import { ZSkeletonComponent } from '../shared/ui/skeleton/z-skeleton.component';

const meta: Meta = {
  title: 'Pages/Core Flow States',
  decorators: [
    moduleMetadata({
      imports: [
        LucideCheck,
        LucideFileVideo,
        LucideUpload,
        LucideUsers,
        LucideVideo,
        ZBadgeComponent,
        ZButtonComponent,
        ZComboboxComponent,
        ZEmptyStateComponent,
        ZSkeletonComponent,
      ],
    }),
  ],
  render: () => ({
    props: {
      groupOptions: [
        { value: 'academy', label: 'Academy Group' },
        { value: 'advanced', label: 'Advanced Training' },
      ],
      selectedGroup: 'academy',
    },
    template: `
      <div class="grid gap-10 bg-[var(--z-bg)] p-6 text-[var(--z-text)]">

        <section class="grid gap-3">
          <h2 class="text-base font-semibold">Video list states</h2>
          <div class="grid gap-3 lg:grid-cols-3">
            <div class="rounded-lg border border-[var(--z-border)] bg-white p-4">
              <z-skeleton class="block h-24 w-full"></z-skeleton>
            </div>
            <z-empty-state title="No videos yet" description="Get started by uploading a video for review." />
            <div class="rounded-lg border border-[var(--z-border)] bg-white p-4">
              <div class="flex items-center gap-3">
                <span class="grid size-10 place-items-center rounded-md bg-[var(--z-surface-warm)] text-[var(--z-primary)]">
                  <svg lucideVideo class="size-5" aria-hidden="true"></svg>
                </span>
                <div class="min-w-0 flex-1">
                  <p class="truncate text-sm font-semibold">Jump line review</p>
                  <p class="mt-1 text-sm text-[var(--z-muted)]">Academy group</p>
                </div>
                <z-badge tone="primary">In review</z-badge>
              </div>
            </div>
          </div>
        </section>

        <section class="grid gap-3">
          <h2 class="text-base font-semibold">Group list states</h2>
          <div class="grid gap-3 lg:grid-cols-3">
            <div class="rounded-lg border border-[var(--z-border)] bg-white p-4">
              <z-skeleton class="block h-32 w-full"></z-skeleton>
            </div>
            <z-empty-state title="No groups yet" description="Create a group for your students to get started." />
            <div class="rounded-lg border border-[var(--z-border)] bg-white p-4">
              <div class="flex items-start gap-3">
                <span class="grid size-12 place-items-center rounded-md bg-[var(--z-surface-warm)] text-[var(--z-primary)]">
                  <svg lucideUsers class="size-6" aria-hidden="true"></svg>
                </span>
                <div>
                  <p class="text-sm font-semibold">Academy</p>
                  <p class="mt-1 text-sm leading-5 text-[var(--z-muted)]">Students and experts preparing review videos.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section class="grid gap-3">
          <h2 class="text-base font-semibold">Upload video — step states</h2>
          <div class="grid gap-4 lg:grid-cols-3">

            <!-- Step 1: File picker with a file added -->
            <div class="grid gap-4 rounded-lg border border-[var(--z-border)] bg-white p-5 shadow-sm">
              <z-badge tone="primary">Step 1 · Select file</z-badge>
              <div class="grid min-h-32 place-items-center rounded-lg border border-dashed border-[var(--z-border)] bg-[var(--z-surface-warm)] p-4 text-center">
                <span class="grid gap-2">
                  <span class="mx-auto grid size-10 place-items-center rounded-lg bg-white text-[var(--z-primary)]">
                    <svg lucideUpload class="size-5" aria-hidden="true"></svg>
                  </span>
                  <span class="text-xs font-semibold">Drop video or click to upload</span>
                </span>
              </div>
              <div class="flex items-center gap-3 rounded-md border border-[var(--z-border)] p-3">
                <svg lucideFileVideo class="size-5 text-[var(--z-primary)]" aria-hidden="true"></svg>
                <span class="min-w-0 flex-1 truncate text-sm font-semibold">jump-line-take2.mp4</span>
                <z-badge>24 MB</z-badge>
              </div>
            </div>

            <!-- Step 2: Details form with group combobox -->
            <div class="grid gap-4 rounded-lg border border-[var(--z-border)] bg-white p-5 shadow-sm">
              <z-badge tone="primary">Step 2 · Details</z-badge>
              <div class="grid gap-2">
                <span class="text-sm font-semibold">Title</span>
                <div class="min-h-11 rounded-md border border-[var(--z-border)] bg-white px-3 py-2.5 text-sm text-[var(--z-muted)]">Jump line take 2</div>
              </div>
              <div class="grid gap-2">
                <span class="text-sm font-semibold">Group</span>
                <z-combobox [options]="groupOptions" [value]="selectedGroup" placeholder="Select a group" />
              </div>
            </div>

            <!-- Step 3: Review -->
            <div class="grid gap-4 rounded-lg border border-[var(--z-border)] bg-white p-5 shadow-sm">
              <z-badge tone="primary">Step 3 · Review</z-badge>
              <div class="flex items-center gap-3">
                <span class="grid size-10 place-items-center rounded-md bg-[var(--z-surface-warm)] text-[var(--z-primary)]">
                  <svg lucideCheck class="size-5" aria-hidden="true"></svg>
                </span>
                <div>
                  <p class="text-sm font-semibold">Ready to upload</p>
                  <p class="mt-1 text-xs text-[var(--z-muted)]">Review and confirm details below.</p>
                </div>
              </div>
              <div class="grid gap-2 rounded-md border border-[var(--z-border)] p-3 text-sm">
                <p><strong>Title:</strong> Jump line take 2</p>
                <p><strong>Group:</strong> Academy Group</p>
                <p><strong>Files:</strong> 1 video</p>
              </div>
              <z-button size="sm">Start upload</z-button>
            </div>

          </div>
        </section>

      </div>
    `,
  }),
};

export default meta;

type Story = StoryObj;

export const CoreStates: Story = {};
