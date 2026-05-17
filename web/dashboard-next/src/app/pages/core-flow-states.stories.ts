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
import { ZEmptyStateComponent } from '../shared/ui/empty-state/z-empty-state.component';
import { ZSelectComponent } from '../shared/ui/select/z-select.component';
import { ZSkeletonComponent } from '../shared/ui/skeleton/z-skeleton.component';
import { ZTextInputComponent } from '../shared/ui/text-input/z-text-input.component';
import { ZTextareaComponent } from '../shared/ui/textarea/z-textarea.component';

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
        ZEmptyStateComponent,
        ZSelectComponent,
        ZSkeletonComponent,
        ZTextInputComponent,
        ZTextareaComponent,
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
          <h2 class="text-base font-semibold">Video detail — review state</h2>
          <div class="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
            <div class="grid gap-3">
              <div class="grid aspect-video place-items-center rounded-lg border border-[var(--z-border)] bg-black text-white">
                <span class="grid gap-2 text-center">
                  <svg lucideVideo class="mx-auto size-10" aria-hidden="true"></svg>
                  <span class="text-sm font-semibold">Mux player surface</span>
                </span>
              </div>
              <div class="rounded-lg border border-[var(--z-border)] bg-white p-4">
                <z-badge tone="primary">In review</z-badge>
                <h3 class="mt-3 text-lg font-semibold">Jump line review</h3>
                <p class="mt-2 text-sm leading-6 text-[var(--z-muted)]">Two clips from today's arena session.</p>
              </div>
            </div>
            <div class="grid content-start gap-3">
              <div class="rounded-lg border border-[var(--z-border)] bg-white p-4">
                <div class="flex items-center justify-between">
                  <h3 class="text-sm font-semibold">Video parts</h3>
                  <z-badge>2</z-badge>
                </div>
                <div class="mt-3 grid gap-2">
                  <button class="flex items-center justify-between rounded-md border border-[var(--z-primary)] bg-[var(--z-surface-warm)] p-3 text-left">
                    <span class="text-sm font-semibold">Part 1</span>
                    <z-badge>1</z-badge>
                  </button>
                  <button class="flex items-center justify-between rounded-md border border-[var(--z-border)] p-3 text-left">
                    <span class="text-sm font-semibold">Part 2</span>
                    <z-badge>0</z-badge>
                  </button>
                </div>
              </div>
              <div class="rounded-lg border border-[var(--z-border)] bg-white p-4">
                <h3 class="text-sm font-semibold">Comments</h3>
                <article class="mt-3 rounded-md border border-[var(--z-border)] bg-[var(--z-bg)] p-3">
                  <p class="text-sm leading-6">Great rhythm through the corner.</p>
                  <p class="mt-2 text-xs text-[var(--z-muted)]">00:12</p>
                </article>
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

            <!-- Step 2: Details form with group select -->
            <div class="grid gap-4 rounded-lg border border-[var(--z-border)] bg-white p-5 shadow-sm">
              <z-badge tone="primary">Step 2 · Details</z-badge>
              <div class="grid gap-2">
                <span class="text-sm font-semibold">Title</span>
                <z-text-input placeholder="e.g. Jump line take 2" />
              </div>
              <div class="grid gap-2">
                <span class="text-sm font-semibold">Description</span>
                <z-textarea
                  [rows]="3"
                  placeholder="Add context, goals, or notes for the reviewer."
                />
              </div>
              <div class="grid gap-2">
                <span class="text-sm font-semibold">Group</span>
                <z-select [options]="groupOptions" [value]="selectedGroup" placeholder="Select a group" />
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
