import { render } from '@testing-library/react-native';
import { ZSymbol } from './z-symbol';
import { SYMBOL_MAP } from './z-symbol.map';
import type { ZSymbolName } from './z-symbol.types';

test('renders with an accessibility label', async () => {
  const { getByLabelText } = await render(<ZSymbol name="home" label="Home" />);
  expect(getByLabelText('Home')).toBeTruthy();
});

test('play maps to a lucide Play fallback', async () => {
  const { getByTestId } = await render(<ZSymbol name="play" label="Play" testID="play-sym" />);
  expect(getByTestId('play-sym')).toBeOnTheScreen();
});

const ALL_NAMES = Object.keys(SYMBOL_MAP) as ZSymbolName[];

test.each(ALL_NAMES)('ZSymbol "%s" renders without throwing and has a SYMBOL_MAP entry', async (name) => {
  // Verify the map entry has all three required fields
  const entry = SYMBOL_MAP[name];
  expect(entry).toBeDefined();
  expect(typeof entry.sf).toBe('string');
  expect(entry.sf.length).toBeGreaterThan(0);
  expect(typeof entry.android).toBe('string');
  expect(entry.android.length).toBeGreaterThan(0);
  expect(entry.lucide).toBeDefined();

  // Verify the component renders without throwing
  const { getByLabelText } = await render(<ZSymbol name={name} label={`icon-${name}`} />);
  expect(getByLabelText(`icon-${name}`)).toBeTruthy();
});
