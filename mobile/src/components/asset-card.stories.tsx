import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import type { Asset } from '../api/queries/assets';
import { AssetCard } from './asset-card';
import { mockAsset, mockAssetProcessing, mockAssetFailed } from './__stories__/fixtures';

const meta = {
  title: 'Components/Asset Card',
  component: AssetCard,
  args: { asset: mockAsset, onPress: () => {} },
} satisfies Meta<typeof AssetCard>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

// Edge case: completed, no group accent → falls back to the description line.
const mockAssetNoGroup: Asset = {
  id: 'ast_01HZX0000000000000000000D',
  title: 'Solo mobility flow',
  description: 'Hip and shoulder mobility warm-up routine.',
  owner_id: 'usr_owner_0001',
  status: 'completed',
  thumbnail: undefined,
  playback_id: 'pb_completed_0002',
  review_count: 27,
};

// Edge case: title only — no group and no description → secondary line hidden.
const mockAssetTitleOnly: Asset = {
  id: 'ast_01HZX0000000000000000000E',
  title: 'Quick clip',
  description: '',
  owner_id: 'usr_owner_0001',
  status: 'completed',
  thumbnail: undefined,
  review_count: 0,
};

export const States: Story = {
  render: () => (
    <View className="gap-3">
      {/* completed (reviewed) — thumbnail + group accent + reviews */}
      <AssetCard asset={mockAsset} onPress={() => {}} />
      {/* pending (in review) — long title/description overflow, no thumbnail */}
      <AssetCard asset={mockAssetProcessing} onPress={() => {}} />
      {/* waiting_upload (uploading) — no group, empty description */}
      <AssetCard asset={mockAssetFailed} onPress={() => {}} />
      {/* completed, no group accent → description fallback + high review count */}
      <AssetCard asset={mockAssetNoGroup} onPress={() => {}} />
      {/* completed, title only → secondary line omitted */}
      <AssetCard asset={mockAssetTitleOnly} onPress={() => {}} />
    </View>
  ),
};
