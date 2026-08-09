import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import type { UploadJob } from '../upload/upload-store';
import { UploadProgressCard } from './upload-progress-card';
import { mockUploadInProgress, mockUploadFailed } from './__stories__/fixtures';

// Local fixtures for the two job statuses not represented in the shared
// fixtures file: `completing` (server-side finalization, still shows the
// progress bar) and `done` (finished, shows the dismiss button).
const mockUploadCompleting: UploadJob = {
  id: 'ast_upload_0003',
  title: 'Closed-guard sweep drills',
  status: 'completing',
  files: [
    {
      videoId: 'vid_0004',
      uploadUrl: '',
      localUri: 'file:///tmp/sweep-1.mp4',
      filename: 'sweep-1.mp4',
      progress: 1,
      status: 'done',
    },
    {
      videoId: 'vid_0005',
      uploadUrl: '',
      localUri: 'file:///tmp/sweep-2.mp4',
      filename: 'sweep-2.mp4',
      progress: 1,
      status: 'done',
    },
  ],
};

const mockUploadDone: UploadJob = {
  id: 'ast_upload_0004',
  title: 'Takedown entries',
  status: 'done',
  files: [
    {
      videoId: 'vid_0006',
      uploadUrl: '',
      localUri: 'file:///tmp/takedown-1.mp4',
      filename: 'takedown-1.mp4',
      progress: 1,
      status: 'done',
    },
  ],
};

const meta = {
  title: 'Components/Upload Progress Card',
  component: UploadProgressCard,
  args: {
    job: mockUploadInProgress,
    onRetry: () => {},
    onDismiss: () => {},
  },
} satisfies Meta<typeof UploadProgressCard>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const States: Story = {
  render: (args) => (
    <View className="gap-3">
      {/* uploading — progress bar + done/total count */}
      <UploadProgressCard {...args} job={mockUploadInProgress} />
      {/* completing — server-side finalization, still shows the progress bar */}
      <UploadProgressCard {...args} job={mockUploadCompleting} />
      {/* done — dismiss (X) button, no progress bar */}
      <UploadProgressCard {...args} job={mockUploadDone} />
      {/* failed — retry button + error text */}
      <UploadProgressCard {...args} job={mockUploadFailed} />
    </View>
  ),
};
