import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { LucideUsers } from 'lucide-react-native';
import { colors } from '../../theme/colors';
import { ZIconTile, type ZIconTileTone, type ZIconTileSize } from './z-icon-tile';

const tones = ['neutral', 'primary', 'success', 'warning', 'danger'] as const satisfies readonly ZIconTileTone[];
const sizes = ['sm', 'md'] as const satisfies readonly ZIconTileSize[];

/** The component expects an already-tone-coloured lucide glyph as `icon`. */
const toneGlyphColor: Record<ZIconTileTone, string> = {
  neutral: colors.primary,
  primary: colors.primary,
  success: colors.success,
  warning: colors.warning,
  danger: colors.danger,
};

const meta = {
  title: 'UI/Icon Tile',
  component: ZIconTile,
  args: {
    tone: 'neutral',
    size: 'md',
    icon: <LucideUsers size={18} color={toneGlyphColor.neutral} />,
  },
  argTypes: {
    tone: { control: 'radio', options: tones },
    size: { control: 'radio', options: sizes },
  },
} satisfies Meta<typeof ZIconTile>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const States: Story = {
  render: () => (
    <View className="gap-3">
      {sizes.map((size) => (
        <View key={size} className="flex-row flex-wrap items-center gap-3">
          {tones.map((tone) => (
            <ZIconTile
              key={`${size}-${tone}`}
              tone={tone}
              size={size}
              icon={<LucideUsers size={size === 'sm' ? 16 : 18} color={toneGlyphColor[tone]} />}
            />
          ))}
        </View>
      ))}
    </View>
  ),
};
