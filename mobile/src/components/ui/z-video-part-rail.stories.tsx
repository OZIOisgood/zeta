import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useState } from 'react';
import { View } from 'react-native';

import { ZVideoPartRail, type ZVideoPart } from './z-video-part-rail';

const meta = {
  title: 'UI/VideoPartRail',
  component: ZVideoPartRail,
  // Default args satisfy the (all-required) props type; the individual stories
  // below override via `render` with an interactive, stateful wrapper.
  args: { parts: [], activeId: null, onChange: () => {} },
} satisfies Meta<typeof ZVideoPartRail>;
export default meta;

type Story = StoryObj<typeof meta>;

/** Interactive wrapper so pressing a pill/row actually moves the selection. */
function Interactive({ parts, initial }: { parts: ZVideoPart[]; initial: string }) {
  const [activeId, setActiveId] = useState(initial);
  return (
    <View className="bg-z-bg py-4">
      <ZVideoPartRail parts={parts} activeId={activeId} onChange={setActiveId} />
    </View>
  );
}

const fiveParts: ZVideoPart[] = [
  { id: 'v1', ready: true },
  { id: 'v2', ready: true },
  { id: 'v3', ready: true },
  { id: 'v4', ready: false },
  { id: 'v5', ready: true },
];

const eightParts: ZVideoPart[] = Array.from({ length: 8 }, (_, i) => ({
  id: `v${i + 1}`,
  ready: i !== 6, // one processing clip
}));

/** Two clips: minimal subtle pill row. */
export const TwoParts: Story = {
  render: () => (
    <Interactive
      parts={[
        { id: 'v1', ready: true },
        { id: 'v2', ready: true },
      ]}
      initial="v1"
    />
  ),
};

/** Five clips, one still processing (dimmed + spinner, inert). */
export const FivePartsOneProcessing: Story = {
  render: () => <Interactive parts={fiveParts} initial="v2" />,
};

/** Eight clips: collapses to a "Part X of N" trigger + bottom sheet. */
export const EightPartsSheet: Story = {
  render: () => <Interactive parts={eightParts} initial="v1" />,
};
