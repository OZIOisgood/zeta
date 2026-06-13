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

test('primary tone uses z-primary-soft surface', async () => {
  await render(<ZIconTile icon={<Glyph />} tone="primary" testID="tile" />);
  expect(screen.getByTestId('tile').props.className).toContain('bg-z-primary-soft');
});

/**
 * Regression: success/warning/danger tiles previously backed the tile with the
 * SAME saturated token used for the foreground glyph (e.g. bg-z-danger +
 * color={colors.danger}), making the glyph invisible. Each must now use a
 * *-soft surface so the tile background and the glyph foreground differ.
 */
test.each(['success', 'warning', 'danger'] as const)(
  '%s tone uses a soft surface — bg-z-%s-soft — not the saturated foreground token bg-z-%s',
  async (tone) => {
    await render(<ZIconTile icon={<Glyph />} tone={tone} testID="tile" />);
    const cls = screen.getByTestId('tile').props.className as string;
    // Must use the soft variant…
    expect(cls).toContain(`bg-z-${tone}-soft`);
    // …and must NOT use the same saturated token that the foreground glyph carries.
    // The pattern `bg-z-danger` (without "-soft") must be absent.
    expect(cls).not.toMatch(new RegExp(`bg-z-${tone}(?!-soft)`));
    // No raw palette fallbacks.
    expect(cls).not.toMatch(/bg-(green|amber|rose|red|emerald)-\d/);
  },
);
