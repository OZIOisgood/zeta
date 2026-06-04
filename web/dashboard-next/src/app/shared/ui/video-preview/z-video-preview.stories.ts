import type { Meta, StoryObj } from '@storybook/angular';
import { moduleMetadata } from '@storybook/angular';
import { ZVideoPreviewComponent } from './z-video-preview.component';

const meta: Meta<ZVideoPreviewComponent> = {
  title: 'UI/Video Preview',
  component: ZVideoPreviewComponent,
  decorators: [
    moduleMetadata({
      imports: [ZVideoPreviewComponent],
    }),
  ],
  args: {
    thumbnail: 'https://image.mux.com/test/thumbnail.jpg?width=640&height=360',
  },
  render: (args) => ({
    props: args,
    template: `
      <div class="max-w-sm bg-[var(--z-bg)] p-6">
        <z-video-preview class="aspect-video rounded-md" [thumbnail]="thumbnail" />
      </div>
    `,
  }),
};

export default meta;

type Story = StoryObj<ZVideoPreviewComponent>;

export const Default: Story = {};
