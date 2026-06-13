import { render, screen } from '@testing-library/react-native';
import { View } from 'react-native';
import { ZIconTile } from './z-icon-tile';

const Glyph = () => <View testID="glyph" />;

test('renders the passed glyph', async () => {
  await render(<ZIconTile icon={<Glyph />} />);
  expect(screen.getByTestId('glyph')).toBeOnTheScreen();
});

test('defaults to md sizing (h-10 w-10)', async () => {
  await render(<ZIconTile icon={<Glyph />} testID="tile" />);
  expect(screen.getByTestId('tile').props.className).toContain('h-10');
  expect(screen.getByTestId('tile').props.className).toContain('w-10');
});

test('sm sizing applies h-9 w-9', async () => {
  await render(<ZIconTile icon={<Glyph />} size="sm" testID="tile" />);
  expect(screen.getByTestId('tile').props.className).toContain('h-9');
  expect(screen.getByTestId('tile').props.className).toContain('w-9');
});

test('default tone is neutral (z-surface-warm)', async () => {
  await render(<ZIconTile icon={<Glyph />} testID="tile" />);
  expect(screen.getByTestId('tile').props.className).toContain('bg-z-surface-warm');
});

test.each(['primary', 'success', 'warning', 'danger'] as const)(
  '%s tone uses a z-* token surface, never a raw palette class',
  async (tone) => {
    await render(<ZIconTile icon={<Glyph />} tone={tone} testID="tile" />);
    const cls = screen.getByTestId('tile').props.className as string;
    expect(cls).toContain(`bg-z-${tone}`);
    expect(cls).not.toMatch(/bg-(green|amber|rose|red|emerald)-\d/);
  },
);
