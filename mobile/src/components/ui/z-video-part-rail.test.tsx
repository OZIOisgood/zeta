import { render, screen, userEvent } from '@testing-library/react-native';
import { initI18n } from '../../i18n';
import { ZVideoPartRail } from './z-video-part-rail';
import type { ZVideoPart } from './z-video-part-rail.types';

beforeAll(async () => {
  await initI18n('en');
});

function ready(n: number): ZVideoPart[] {
  return Array.from({ length: n }, (_, i) => ({ id: `v${i + 1}`, ready: true }));
}

// ── Progressive disclosure ────────────────────────────────────────────────────

test('renders nothing for zero parts', async () => {
  await render(<ZVideoPartRail parts={[]} activeId={null} onChange={jest.fn()} testID="rail" />);
  expect(screen.queryByTestId('rail')).toBeNull();
});

test('renders nothing for a single part', async () => {
  await render(
    <ZVideoPartRail parts={ready(1)} activeId="v1" onChange={jest.fn()} testID="rail" />,
  );
  expect(screen.queryByTestId('rail')).toBeNull();
});

// ── Pill row (2–5 parts) ──────────────────────────────────────────────────────

test('renders a pill per part for 2–5 parts', async () => {
  await render(
    <ZVideoPartRail parts={ready(3)} activeId="v1" onChange={jest.fn()} testID="rail" />,
  );
  expect(screen.getByTestId('rail')).toBeOnTheScreen();
  expect(screen.getByText('Part 1')).toBeOnTheScreen();
  expect(screen.getByText('Part 2')).toBeOnTheScreen();
  expect(screen.getByText('Part 3')).toBeOnTheScreen();
  // "Parts" label
  expect(screen.getByText('Parts')).toBeOnTheScreen();
});

test('the active pill reflects activeId', async () => {
  await render(<ZVideoPartRail parts={ready(3)} activeId="v2" onChange={jest.fn()} />);
  const pill = screen.getByTestId('part-pill-v2');
  expect(pill.props.className).toContain('bg-secondary-container');
});

test('tapping a ready pill calls onChange with its id', async () => {
  const user = userEvent.setup();
  const onChange = jest.fn();
  await render(<ZVideoPartRail parts={ready(3)} activeId="v1" onChange={onChange} />);
  await user.press(screen.getByTestId('part-pill-v3'));
  expect(onChange).toHaveBeenCalledWith('v3');
});

test('tapping a processing (not-ready) pill does not call onChange', async () => {
  const user = userEvent.setup();
  const onChange = jest.fn();
  const parts: ZVideoPart[] = [
    { id: 'v1', ready: true },
    { id: 'v2', ready: false },
    { id: 'v3', ready: true },
  ];
  await render(<ZVideoPartRail parts={parts} activeId="v1" onChange={onChange} />);
  await user.press(screen.getByTestId('part-pill-v2'));
  expect(onChange).not.toHaveBeenCalled();
});

// ── Overflow sheet (>5 parts) ─────────────────────────────────────────────────

test('renders a trigger (not a pill row) for more than 5 parts', async () => {
  await render(<ZVideoPartRail parts={ready(8)} activeId="v2" onChange={jest.fn()} testID="rail" />);
  expect(screen.getByTestId('rail')).toBeOnTheScreen();
  // The trigger reads "Part 2 of 8" (videos.partOfCount, 1-based active index)
  expect(screen.getByText('Part 2 of 8')).toBeOnTheScreen();
  // The pill row is NOT used: individual pills are absent
  expect(screen.queryByTestId('part-pill-v1')).toBeNull();
});

test('opening the trigger shows the sheet rows', async () => {
  const user = userEvent.setup();
  await render(<ZVideoPartRail parts={ready(8)} activeId="v1" onChange={jest.fn()} />);
  await user.press(screen.getByTestId('part-rail-trigger'));
  // Sheet rows render one row per part
  expect(screen.getByTestId('part-row-v1')).toBeOnTheScreen();
  expect(screen.getByTestId('part-row-v8')).toBeOnTheScreen();
});

test('tapping a ready sheet row calls onChange and closes the sheet', async () => {
  const user = userEvent.setup();
  const onChange = jest.fn();
  await render(<ZVideoPartRail parts={ready(8)} activeId="v1" onChange={onChange} />);
  await user.press(screen.getByTestId('part-rail-trigger'));
  await user.press(screen.getByTestId('part-row-v6'));
  expect(onChange).toHaveBeenCalledWith('v6');
  // Sheet closed → rows gone
  expect(screen.queryByTestId('part-row-v6')).toBeNull();
});

test('tapping a processing sheet row does not call onChange', async () => {
  const user = userEvent.setup();
  const onChange = jest.fn();
  const parts: ZVideoPart[] = [
    ...ready(7),
    { id: 'v8', ready: false },
  ];
  await render(<ZVideoPartRail parts={parts} activeId="v1" onChange={onChange} />);
  await user.press(screen.getByTestId('part-rail-trigger'));
  await user.press(screen.getByTestId('part-row-v8'));
  expect(onChange).not.toHaveBeenCalled();
  // Sheet stays open (processing row is inert) → other rows still present
  expect(screen.getByTestId('part-row-v1')).toBeOnTheScreen();
  // The processing row shows the processing label
  expect(screen.getByText('Processing')).toBeOnTheScreen();
});
