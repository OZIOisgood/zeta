import type { Meta, StoryObj } from '@storybook/angular';
import { moduleMetadata } from '@storybook/angular';
import { ZTabPanelComponent } from './z-tab-panel.component';
import { ZTabsComponent } from './z-tabs.component';

const meta: Meta = {
  title: 'UI/Tabs',
  decorators: [
    moduleMetadata({
      imports: [ZTabsComponent, ZTabPanelComponent],
    }),
  ],
  render: () => ({
    props: {
      activeTab: 'upcoming',
      options: [
        { value: 'upcoming', label: 'Upcoming', badge: 0 },
        { value: 'past', label: 'Past', badge: 2 },
        { value: 'cancelled', label: 'Cancelled', badge: 0 },
      ],
    },
    template: `
      <div class="grid max-w-3xl gap-4 bg-[var(--z-bg)] p-6 text-[var(--z-text)]">
        <z-tabs
          tabsId="session-story-tabs"
          label="Session views"
          [options]="options"
          [value]="activeTab"
          (valueChange)="activeTab = $event"
        />
        <z-tab-panel tabsId="session-story-tabs" [value]="activeTab">
          <div class="rounded-lg border border-dashed border-[var(--z-border)] bg-white p-8 text-center">
            <h2 class="font-semibold">{{ activeTab }} sessions</h2>
            <p class="mt-2 text-sm text-[var(--z-muted)]">Selected tab content renders here.</p>
          </div>
        </z-tab-panel>
      </div>
    `,
  }),
};

export default meta;

type Story = StoryObj;

export const Sessions: Story = {};
