# Mobile Booking Flow Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the single-scroll accordion booking screen with a stepped flow (navigable stepper · per-step decision · date-rail + time-grid · persistent summary bar) built from `z-*` primitives.

**Architecture:** Three new Custom-RN primitives (`ZDateRail`, `ZTimeGrid`, `ZBookingBar`), one enhancement (`ZStepper` gains a `reached` prop for back/forward jumps), and a full rewrite of `app/book.tsx` into a stage state-machine. Existing `coaching` query hooks and the `ZListItem`/`ZAvatar`/`ZIconTile`/`ZBadge`/`ZTextarea` primitives are reused unchanged. One new i18n key (`common.labels.today`).

**Tech Stack:** Expo SDK 56 / React Native, expo-router (formSheet route), NativeWind role tokens, react-i18next, TanStack Query, jest + @testing-library/react-native, Storybook (react-native-web-vite).

**Spec:** `docs/superpowers/specs/2026-06-19-mobile-booking-flow-redesign-design.md`

**Conventions for every task:**
- Run all `pnpm`/`make`/`npx` commands inside WSL: `wsl.exe -d ubuntu bash -lc 'cd ~/dev/projects/zeta/mobile && <cmd>'` (the Bash tool runs on Windows and cannot `cd` into the UNC path).
- Stage explicit paths to `git add` (never `git add -A`). No `Co-Authored-By` trailer.
- Colors: new primitives use **role-token NativeWind classes** (`bg-accent`, `text-on-accent`, `bg-surface-1`, `text-on-surface`, `border-outline`) — never hex. The screen may keep the legacy `text-z-*` classes already used in `book.tsx`.

---

## File Structure

**New files (each new primitive = single bare `.tsx`, Custom-RN tier (b) — no `.ios`/`.android` split):**
- `mobile/src/components/ui/z-date-rail.types.ts` — `ZDateRailDay`, `ZDateRailProps`.
- `mobile/src/components/ui/z-date-rail.tsx` — horizontal day-pill rail.
- `mobile/src/components/ui/z-date-rail.stories.tsx`
- `mobile/src/components/ui/z-date-rail.test.tsx`
- `mobile/src/components/ui/z-time-grid.types.ts` — `ZTimeGridSlot`, `ZTimeGridProps`.
- `mobile/src/components/ui/z-time-grid.tsx` — 3-column start-time grid.
- `mobile/src/components/ui/z-time-grid.stories.tsx`
- `mobile/src/components/ui/z-time-grid.test.tsx`
- `mobile/src/components/ui/z-booking-bar.types.ts` — `ZBookingBarProps`.
- `mobile/src/components/ui/z-booking-bar.tsx` — fixed footer summary bar.
- `mobile/src/components/ui/z-booking-bar.stories.tsx`
- `mobile/src/components/ui/z-booking-bar.test.tsx`

**Modified files:**
- `mobile/src/components/ui/z-stepper.tsx` — add `reached?: number`.
- `mobile/src/components/ui/z-stepper.stories.tsx` — add navigable story.
- `mobile/src/components/ui/z-stepper.test.tsx` — add `reached` gating tests.
- `mobile/src/app/book.tsx` — full rewrite.
- `mobile/src/__tests__/book-flow.test.tsx` — full rewrite.
- `mobile/src/i18n/locales/{en,de,fr}.json` — add `common.labels.today`.
- `web/dashboard-next/public/i18n/{en,de,fr}.json` — add `common.labels.today` (source of truth).

---

## Task 1: Add `common.labels.today` i18n key

**Files:**
- Modify: `web/dashboard-next/public/i18n/en.json` (`common.labels`)
- Modify: `web/dashboard-next/public/i18n/de.json` (`common.labels`)
- Modify: `web/dashboard-next/public/i18n/fr.json` (`common.labels`)
- Modify: `mobile/src/i18n/locales/en.json` (`common.labels`)
- Modify: `mobile/src/i18n/locales/de.json` (`common.labels`)
- Modify: `mobile/src/i18n/locales/fr.json` (`common.labels`)

> We add the key by hand to both the web source and the mobile mirror rather than running `pnpm run sync:i18n`, because the sync is destructive (it drops mobile-only keys like `sessions.call.sessionFallback`). One key, mirrored by hand, is safe.

- [ ] **Step 1: Add the key to all six files**

In each file, inside the existing `common.labels` object, add a `"today"` entry next to `"minutesShort"`. Values:
- en (both `web/.../en.json` and `mobile/.../en.json`): `"today": "Today"`
- de (both): `"today": "Heute"`
- fr (both): `"today": "Aujourd'hui"`

- [ ] **Step 2: Verify JSON parses and the key resolves**

Run: `wsl.exe -d ubuntu bash -lc 'cd ~/dev/projects/zeta && for l in en de fr; do node -e "console.log(\"$l\", require(\"./mobile/src/i18n/locales/$l.json\").common.labels.today)"; done'`
Expected: `en Today` / `de Heute` / `fr Aujourd'hui` (no JSON parse errors).

- [ ] **Step 3: Commit**

```bash
git add web/dashboard-next/public/i18n/en.json web/dashboard-next/public/i18n/de.json web/dashboard-next/public/i18n/fr.json mobile/src/i18n/locales/en.json mobile/src/i18n/locales/de.json mobile/src/i18n/locales/fr.json
git commit -m "i18n(mobile): add common.labels.today for booking date rail"
```

---

## Task 2: Make `ZStepper` navigable (`reached` prop)

**Files:**
- Modify: `mobile/src/components/ui/z-stepper.tsx`
- Test: `mobile/src/components/ui/z-stepper.test.tsx`
- Modify: `mobile/src/components/ui/z-stepper.stories.tsx`

- [ ] **Step 1: Write the failing tests**

Append to `mobile/src/components/ui/z-stepper.test.tsx`:

```tsx
import { fireEvent, render, screen } from '@testing-library/react-native';
import { ZStepper, type ZStep } from './z-stepper';

const STEPS: ZStep[] = [
  { label: 'Expert', state: 'completed' },
  { label: 'Type', state: 'active' },
  { label: 'Time', state: 'upcoming' },
  { label: 'Confirm', state: 'upcoming' },
];

test('reached gates press: index <= reached is pressable, beyond is not', () => {
  const onStepPress = jest.fn();
  // reached = 2 → indices 0,1,2 pressable; index 3 locked
  render(<ZStepper steps={STEPS} reached={2} onStepPress={onStepPress} />);

  fireEvent.press(screen.getByLabelText('Expert')); // index 0, reached
  expect(onStepPress).toHaveBeenCalledWith(0);

  onStepPress.mockClear();
  fireEvent.press(screen.getByLabelText('Time')); // index 2, == reached
  expect(onStepPress).toHaveBeenCalledWith(2);

  onStepPress.mockClear();
  fireEvent.press(screen.getByLabelText('Confirm')); // index 3, > reached → locked
  expect(onStepPress).not.toHaveBeenCalled();
});

test('without reached, falls back to upcoming-disabled behavior', () => {
  const onStepPress = jest.fn();
  render(<ZStepper steps={STEPS} onStepPress={onStepPress} />);
  fireEvent.press(screen.getByLabelText('Time')); // upcoming → disabled
  expect(onStepPress).not.toHaveBeenCalled();
  fireEvent.press(screen.getByLabelText('Expert')); // completed → enabled
  expect(onStepPress).toHaveBeenCalledWith(0);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `wsl.exe -d ubuntu bash -lc 'cd ~/dev/projects/zeta/mobile && npx jest z-stepper.test -t reached'`
Expected: FAIL — the `reached` gating test fails because every reached step is still gated only by `state` (index 2 is `upcoming` → currently disabled, so the press is swallowed and `toHaveBeenCalledWith(2)` fails).

- [ ] **Step 3: Add the `reached` prop to the implementation**

In `mobile/src/components/ui/z-stepper.tsx`, change the function signature and the `disabled` computation:

```tsx
export function ZStepper({
  steps,
  onStepPress,
  reached,
  testID,
}: {
  steps: ZStep[];
  onStepPress?: (index: number) => void;
  /**
   * Highest step index the user has reached. When provided, a step is pressable
   * iff `index <= reached` (enables back/forward jumps to visited steps).
   * When omitted, falls back to the legacy rule: `upcoming` steps are disabled.
   */
  reached?: number;
  testID?: string;
}) {
  const { color } = useRoleColors();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      testID={testID}
      contentContainerStyle={{ flexDirection: 'row', alignItems: 'flex-start' }}
    >
      {steps.map((step, index) => {
        const disabled = reached != null ? index > reached : step.state === 'upcoming';
        return (
```

(The rest of the `.map` body is unchanged — `disabled` is already used by the `Pressable`.)

- [ ] **Step 4: Run the tests to verify they pass**

Run: `wsl.exe -d ubuntu bash -lc 'cd ~/dev/projects/zeta/mobile && npx jest z-stepper.test'`
Expected: PASS (all stepper tests, old + new).

- [ ] **Step 5: Add a navigable Storybook story**

Append to `mobile/src/components/ui/z-stepper.stories.tsx`:

```tsx
export const Navigable: Story = {
  args: {
    steps: [
      { label: 'Expert', state: 'completed' },
      { label: 'Type', state: 'active' },
      { label: 'Time', state: 'upcoming' },
      { label: 'Confirm', state: 'upcoming' },
    ],
    reached: 1,
    onStepPress: () => {},
  },
};
```

- [ ] **Step 6: Commit**

```bash
git add mobile/src/components/ui/z-stepper.tsx mobile/src/components/ui/z-stepper.test.tsx mobile/src/components/ui/z-stepper.stories.tsx
git commit -m "feat(mobile): ZStepper reached prop for back/forward step navigation"
```

---

## Task 3: `ZDateRail` primitive

**Files:**
- Create: `mobile/src/components/ui/z-date-rail.types.ts`
- Create: `mobile/src/components/ui/z-date-rail.tsx`
- Create: `mobile/src/components/ui/z-date-rail.test.tsx`
- Create: `mobile/src/components/ui/z-date-rail.stories.tsx`

- [ ] **Step 1: Write the types**

Create `mobile/src/components/ui/z-date-rail.types.ts`:

```tsx
/**
 * ZDateRail — horizontal day-pill rail (Tier: Custom-RN (b), no native widget).
 *
 * A scrollable row of date pills (weekday/"Today" · day-number · month). Single
 * shared NativeWind implementation (no .ios/.android split) — the look is one
 * branded canvas on both platforms. Press via Touchable; role tokens only.
 */
import type { StyleProp, ViewStyle } from 'react-native';

export type ZDateRailDay = {
  /** Stable identity for the day (e.g. a Date.toDateString() key). */
  key: string;
  /** Top line — weekday abbreviation or a localized "Today". */
  label: string;
  /** Day-of-month number, e.g. "18". */
  day: string;
  /** Month abbreviation, e.g. "Jun". */
  month: string;
  /** Whether this is today (drives emphasis only; label is caller-controlled). */
  isToday?: boolean;
};

export type ZDateRailProps = {
  days: ZDateRailDay[];
  /** Currently selected day key, or '' when none. */
  selectedKey: string;
  onSelect: (key: string) => void;
  className?: string;
  style?: StyleProp<ViewStyle>;
  /** Rail container testID; each pill gets `${testID}-${index}`. */
  testID?: string;
};
```

- [ ] **Step 2: Write the failing test**

Create `mobile/src/components/ui/z-date-rail.test.tsx`:

```tsx
import { fireEvent, render, screen } from '@testing-library/react-native';
import { ZDateRail } from './z-date-rail';
import type { ZDateRailDay } from './z-date-rail.types';

const DAYS: ZDateRailDay[] = [
  { key: 'Tue Jun 18 2026', label: 'Today', day: '18', month: 'Jun', isToday: true },
  { key: 'Wed Jun 19 2026', label: 'Wed', day: '19', month: 'Jun' },
];

test('renders one pill per day and labels them', () => {
  render(<ZDateRail days={DAYS} selectedKey="" onSelect={() => {}} testID="rail" />);
  expect(screen.getByText('Today')).toBeTruthy();
  expect(screen.getByText('19')).toBeTruthy();
});

test('calls onSelect with the day key on press', () => {
  const onSelect = jest.fn();
  render(<ZDateRail days={DAYS} selectedKey="" onSelect={onSelect} testID="rail" />);
  fireEvent.press(screen.getByTestId('rail-1'));
  expect(onSelect).toHaveBeenCalledWith('Wed Jun 19 2026');
});

test('marks the selected day as selected for a11y', () => {
  render(<ZDateRail days={DAYS} selectedKey="Tue Jun 18 2026" onSelect={() => {}} testID="rail" />);
  expect(screen.getByTestId('rail-0').props.accessibilityState).toMatchObject({ selected: true });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `wsl.exe -d ubuntu bash -lc 'cd ~/dev/projects/zeta/mobile && npx jest z-date-rail.test'`
Expected: FAIL — `Cannot find module './z-date-rail'`.

- [ ] **Step 4: Write the implementation**

Create `mobile/src/components/ui/z-date-rail.tsx`:

```tsx
import { ScrollView, Text, View } from 'react-native';
import { Touchable } from './touchable';
import type { ZDateRailDay, ZDateRailProps } from './z-date-rail.types';

export type { ZDateRailDay, ZDateRailProps } from './z-date-rail.types';

/**
 * Horizontal rail of selectable day pills. Selected pill = accent fill /
 * on-accent text; unselected = surface-1 / on-surface. Radius 16 (rounded-2xl).
 */
export function ZDateRail({
  days,
  selectedKey,
  onSelect,
  className,
  style,
  testID,
}: ZDateRailProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      testID={testID}
      className={className}
      style={style}
      contentContainerStyle={{ flexDirection: 'row', gap: 8, paddingVertical: 2 }}
    >
      {days.map((d, index) => {
        const selected = d.key === selectedKey;
        return (
          <Touchable
            key={d.key}
            testID={testID ? `${testID}-${index}` : undefined}
            accessibilityLabel={`${d.label} ${d.day} ${d.month}`}
            selected={selected}
            onPress={() => onSelect(d.key)}
            className={`w-[54px] items-center rounded-2xl py-2.5 ${
              selected ? 'bg-accent' : 'bg-surface-1'
            }`}
          >
            <Text
              className={`text-xs font-bold uppercase ${
                selected ? 'text-on-accent' : 'text-on-surface-variant'
              }`}
            >
              {d.label}
            </Text>
            <Text
              className={`mt-0.5 text-lg font-extrabold ${
                selected ? 'text-on-accent' : 'text-on-surface'
              }`}
            >
              {d.day}
            </Text>
            <Text
              className={`text-[11px] font-semibold ${
                selected ? 'text-on-accent' : 'text-on-surface-variant'
              }`}
            >
              {d.month}
            </Text>
          </Touchable>
        );
      })}
    </ScrollView>
  );
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `wsl.exe -d ubuntu bash -lc 'cd ~/dev/projects/zeta/mobile && npx jest z-date-rail.test'`
Expected: PASS (3 tests).

- [ ] **Step 6: Write the Storybook story**

Create `mobile/src/components/ui/z-date-rail.stories.tsx`:

```tsx
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useState } from 'react';
import { View } from 'react-native';
import { ZDateRail } from './z-date-rail';
import type { ZDateRailDay } from './z-date-rail.types';

const DAYS: ZDateRailDay[] = [
  { key: 'd0', label: 'Today', day: '18', month: 'Jun', isToday: true },
  { key: 'd1', label: 'Wed', day: '19', month: 'Jun' },
  { key: 'd2', label: 'Thu', day: '20', month: 'Jun' },
  { key: 'd3', label: 'Fri', day: '21', month: 'Jun' },
];

const meta = {
  title: 'UI/DateRail',
  component: ZDateRail,
  decorators: [(Story) => <View style={{ padding: 16 }}><Story /></View>],
} satisfies Meta<typeof ZDateRail>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => {
    const [sel, setSel] = useState('d0');
    return <ZDateRail days={DAYS} selectedKey={sel} onSelect={setSel} testID="rail" />;
  },
};
```

- [ ] **Step 7: Commit**

```bash
git add mobile/src/components/ui/z-date-rail.types.ts mobile/src/components/ui/z-date-rail.tsx mobile/src/components/ui/z-date-rail.test.tsx mobile/src/components/ui/z-date-rail.stories.tsx
git commit -m "feat(mobile): ZDateRail day-pill primitive for booking time step"
```

---

## Task 4: `ZTimeGrid` primitive

**Files:**
- Create: `mobile/src/components/ui/z-time-grid.types.ts`
- Create: `mobile/src/components/ui/z-time-grid.tsx`
- Create: `mobile/src/components/ui/z-time-grid.test.tsx`
- Create: `mobile/src/components/ui/z-time-grid.stories.tsx`

- [ ] **Step 1: Write the types**

Create `mobile/src/components/ui/z-time-grid.types.ts`:

```tsx
/**
 * ZTimeGrid — 3-column grid of selectable start times (Tier: Custom-RN (b)).
 *
 * Domain-free: the consumer maps its slots to `{ startsAt, label }` and gets the
 * `startsAt` back on select. Single shared NativeWind implementation. Cells
 * >= 44dp tall, radius 12; selected = accent fill, unselected = outline inset.
 */
import type { StyleProp, ViewStyle } from 'react-native';

export type ZTimeGridSlot = {
  /** Stable identity for the slot (e.g. the ISO starts_at). */
  startsAt: string;
  /** Display label, e.g. "16:00". */
  label: string;
};

export type ZTimeGridProps = {
  slots: ZTimeGridSlot[];
  /** Currently selected startsAt, or '' when none. */
  selectedStartsAt: string;
  onSelect: (startsAt: string) => void;
  /** Optional muted hint rendered once below the grid (e.g. "Duration 30 min"). */
  hint?: string;
  className?: string;
  style?: StyleProp<ViewStyle>;
  /** Grid container testID; each cell gets `${testID}-${slot.startsAt}`. */
  testID?: string;
};
```

- [ ] **Step 2: Write the failing test**

Create `mobile/src/components/ui/z-time-grid.test.tsx`:

```tsx
import { fireEvent, render, screen } from '@testing-library/react-native';
import { ZTimeGrid } from './z-time-grid';
import type { ZTimeGridSlot } from './z-time-grid.types';

const SLOTS: ZTimeGridSlot[] = [
  { startsAt: '2026-06-18T16:00:00Z', label: '16:00' },
  { startsAt: '2026-06-18T16:45:00Z', label: '16:45' },
];

test('renders one cell per slot', () => {
  render(<ZTimeGrid slots={SLOTS} selectedStartsAt="" onSelect={() => {}} testID="grid" />);
  expect(screen.getByText('16:00')).toBeTruthy();
  expect(screen.getByText('16:45')).toBeTruthy();
});

test('calls onSelect with the startsAt on press', () => {
  const onSelect = jest.fn();
  render(<ZTimeGrid slots={SLOTS} selectedStartsAt="" onSelect={onSelect} testID="grid" />);
  fireEvent.press(screen.getByTestId('grid-2026-06-18T16:45:00Z'));
  expect(onSelect).toHaveBeenCalledWith('2026-06-18T16:45:00Z');
});

test('renders the hint when provided', () => {
  render(
    <ZTimeGrid slots={SLOTS} selectedStartsAt="" onSelect={() => {}} hint="Duration 30 min" testID="grid" />,
  );
  expect(screen.getByText('Duration 30 min')).toBeTruthy();
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `wsl.exe -d ubuntu bash -lc 'cd ~/dev/projects/zeta/mobile && npx jest z-time-grid.test'`
Expected: FAIL — `Cannot find module './z-time-grid'`.

- [ ] **Step 4: Write the implementation**

Create `mobile/src/components/ui/z-time-grid.tsx`:

```tsx
import { Text, View } from 'react-native';
import { Touchable } from './touchable';
import type { ZTimeGridProps, ZTimeGridSlot } from './z-time-grid.types';

export type { ZTimeGridProps, ZTimeGridSlot } from './z-time-grid.types';

/**
 * 3-column grid of start-time cells. Selected = accent fill / on-accent text;
 * unselected = surface-1 / on-surface with a 1px outline inset. Radius 12.
 */
export function ZTimeGrid({
  slots,
  selectedStartsAt,
  onSelect,
  hint,
  className,
  style,
  testID,
}: ZTimeGridProps) {
  return (
    <View className={className} style={style} testID={testID}>
      <View className="flex-row flex-wrap" style={{ marginHorizontal: -4 }}>
        {slots.map((s) => {
          const selected = s.startsAt === selectedStartsAt;
          return (
            <View key={s.startsAt} style={{ width: '33.333%', padding: 4 }}>
              <Touchable
                testID={testID ? `${testID}-${s.startsAt}` : undefined}
                accessibilityLabel={s.label}
                selected={selected}
                onPress={() => onSelect(s.startsAt)}
                className={`min-h-[44px] items-center justify-center rounded-xl ${
                  selected ? 'bg-accent' : 'border border-outline bg-surface-1'
                }`}
              >
                <Text
                  className={`text-[15px] font-bold ${
                    selected ? 'text-on-accent' : 'text-on-surface'
                  }`}
                >
                  {s.label}
                </Text>
              </Touchable>
            </View>
          );
        })}
      </View>
      {hint ? <Text className="mt-3 text-xs text-on-surface-variant">{hint}</Text> : null}
    </View>
  );
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `wsl.exe -d ubuntu bash -lc 'cd ~/dev/projects/zeta/mobile && npx jest z-time-grid.test'`
Expected: PASS (3 tests).

- [ ] **Step 6: Write the Storybook story**

Create `mobile/src/components/ui/z-time-grid.stories.tsx`:

```tsx
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useState } from 'react';
import { View } from 'react-native';
import { ZTimeGrid } from './z-time-grid';
import type { ZTimeGridSlot } from './z-time-grid.types';

const SLOTS: ZTimeGridSlot[] = [
  { startsAt: '1', label: '16:00' },
  { startsAt: '2', label: '16:45' },
  { startsAt: '3', label: '17:30' },
  { startsAt: '4', label: '18:15' },
];

const meta = {
  title: 'UI/TimeGrid',
  component: ZTimeGrid,
  decorators: [(Story) => <View style={{ padding: 16 }}><Story /></View>],
} satisfies Meta<typeof ZTimeGrid>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => {
    const [sel, setSel] = useState('');
    return (
      <ZTimeGrid slots={SLOTS} selectedStartsAt={sel} onSelect={setSel} hint="Duration 30 min" testID="grid" />
    );
  },
};
```

- [ ] **Step 7: Commit**

```bash
git add mobile/src/components/ui/z-time-grid.types.ts mobile/src/components/ui/z-time-grid.tsx mobile/src/components/ui/z-time-grid.test.tsx mobile/src/components/ui/z-time-grid.stories.tsx
git commit -m "feat(mobile): ZTimeGrid start-time grid primitive for booking time step"
```

---

## Task 5: `ZBookingBar` primitive

**Files:**
- Create: `mobile/src/components/ui/z-booking-bar.types.ts`
- Create: `mobile/src/components/ui/z-booking-bar.tsx`
- Create: `mobile/src/components/ui/z-booking-bar.test.tsx`
- Create: `mobile/src/components/ui/z-booking-bar.stories.tsx`

- [ ] **Step 1: Write the types**

Create `mobile/src/components/ui/z-booking-bar.types.ts`:

```tsx
/**
 * ZBookingBar — persistent footer summary bar (Tier: Custom-RN composition).
 *
 * Native feel comes from its ZButton child; no platform split of its own. Must
 * be rendered as a SIBLING of the ScrollView inside ZScreen (not inside it) so
 * it stays pinned to the bottom. Left: a headline (e.g. duration) + a context
 * line, or a muted hint when nothing is selected yet. Right: the single CTA.
 */
export type ZBookingBarProps = {
  /** Bold headline, e.g. "30 min". Omit to show `hint` instead. */
  headline?: string;
  /** Muted placeholder shown when `headline` is absent. */
  hint?: string;
  /** Secondary context line under the headline (e.g. "Type · Expert · 16:00"). */
  context?: string;
  ctaLabel: string;
  ctaDisabled?: boolean;
  ctaLoading?: boolean;
  onPress: () => void;
  testID?: string;
};
```

- [ ] **Step 2: Write the failing test**

Create `mobile/src/components/ui/z-booking-bar.test.tsx`:

```tsx
import { fireEvent, render, screen } from '@testing-library/react-native';
import { ZBookingBar } from './z-booking-bar';

test('shows headline + context when headline present', () => {
  render(
    <ZBookingBar headline="30 min" context="Video review · Alice" ctaLabel="Next" onPress={() => {}} testID="bar" />,
  );
  expect(screen.getByText('30 min')).toBeTruthy();
  expect(screen.getByText('Video review · Alice')).toBeTruthy();
});

test('shows hint when headline absent', () => {
  render(<ZBookingBar hint="Choose a type" ctaLabel="Next" onPress={() => {}} testID="bar" />);
  expect(screen.getByText('Choose a type')).toBeTruthy();
});

test('fires onPress when CTA tapped and enabled', () => {
  const onPress = jest.fn();
  render(<ZBookingBar headline="30 min" ctaLabel="Book" onPress={onPress} testID="bar" />);
  fireEvent.press(screen.getByText('Book'));
  expect(onPress).toHaveBeenCalled();
});

test('does not fire onPress when disabled', () => {
  const onPress = jest.fn();
  render(<ZBookingBar headline="30 min" ctaLabel="Book" ctaDisabled onPress={onPress} testID="bar" />);
  fireEvent.press(screen.getByText('Book'));
  expect(onPress).not.toHaveBeenCalled();
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `wsl.exe -d ubuntu bash -lc 'cd ~/dev/projects/zeta/mobile && npx jest z-booking-bar.test'`
Expected: FAIL — `Cannot find module './z-booking-bar'`.

- [ ] **Step 4: Write the implementation**

Create `mobile/src/components/ui/z-booking-bar.tsx`:

```tsx
import { Text, View } from 'react-native';
import { ZButton } from './z-button';
import type { ZBookingBarProps } from './z-booking-bar.types';

export type { ZBookingBarProps } from './z-booking-bar.types';

/**
 * Fixed footer bar with a running summary on the left and the single CTA on the
 * right. 1px outline top edge; background fills so scrolled content does not
 * show through. Bottom padding accounts for the home indicator (ZScreen's
 * `edges={['bottom']}` already applies the safe-area inset on the parent).
 */
export function ZBookingBar({
  headline,
  hint,
  context,
  ctaLabel,
  ctaDisabled,
  ctaLoading,
  onPress,
  testID,
}: ZBookingBarProps) {
  return (
    <View
      testID={testID}
      className="flex-row items-center gap-3 border-t border-outline bg-background px-4 pb-4 pt-3"
    >
      <View className="flex-1">
        {headline ? (
          <>
            <Text className="text-[17px] font-extrabold text-on-surface">{headline}</Text>
            {context ? (
              <Text numberOfLines={1} className="text-xs text-on-surface-variant">
                {context}
              </Text>
            ) : null}
          </>
        ) : (
          <Text className="text-sm text-on-surface-variant">{hint}</Text>
        )}
      </View>
      <ZButton
        testID={testID ? `${testID}-cta` : undefined}
        label={ctaLabel}
        disabled={ctaDisabled}
        loading={ctaLoading}
        onPress={onPress}
      />
    </View>
  );
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `wsl.exe -d ubuntu bash -lc 'cd ~/dev/projects/zeta/mobile && npx jest z-booking-bar.test'`
Expected: PASS (4 tests).

- [ ] **Step 6: Write the Storybook story**

Create `mobile/src/components/ui/z-booking-bar.stories.tsx`:

```tsx
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { ZBookingBar } from './z-booking-bar';

const meta = {
  title: 'UI/BookingBar',
  component: ZBookingBar,
  args: { ctaLabel: 'Next', onPress: () => {} },
} satisfies Meta<typeof ZBookingBar>;
export default meta;

type Story = StoryObj<typeof meta>;

export const WithSelection: Story = {
  args: { headline: '30 min', context: 'Video review · Alice Smith · 16:00' },
};

export const Empty: Story = {
  args: { hint: 'Choose a session type', ctaDisabled: true },
};
```

- [ ] **Step 7: Commit**

```bash
git add mobile/src/components/ui/z-booking-bar.types.ts mobile/src/components/ui/z-booking-bar.tsx mobile/src/components/ui/z-booking-bar.test.tsx mobile/src/components/ui/z-booking-bar.stories.tsx
git commit -m "feat(mobile): ZBookingBar persistent footer summary bar for booking flow"
```

---

## Task 6: Rewrite the booking screen + its flow test

**Files:**
- Modify (rewrite): `mobile/src/__tests__/book-flow.test.tsx`
- Modify (rewrite): `mobile/src/app/book.tsx`

> TDD: rewrite the flow test first (it will fail against the old screen), then rewrite the screen to satisfy it.

- [ ] **Step 1: Rewrite the flow test**

Replace the entire contents of `mobile/src/__tests__/book-flow.test.tsx` with:

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

// ── native module mocks (must precede any import that touches them) ────────────
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => undefined),
  deleteItemAsync: jest.fn(async () => undefined),
}));
jest.mock('expo-localization', () => ({ getLocales: () => [{ languageCode: 'en' }] }));

// ── hook mocks ────────────────────────────────────────────────────────────────
const mockUseGroupsQuery = jest.fn();
const mockUseCoachingExpertsQuery = jest.fn();
const mockUseSessionTypesQuery = jest.fn();
const mockUseSlotsQuery = jest.fn();
const mockMutateAsync = jest.fn();
const mockUseCreateBookingMutation = jest.fn();

jest.mock('../api/queries/groups', () => ({
  ...jest.requireActual('../api/queries/groups'),
  useGroupsQuery: () => mockUseGroupsQuery(),
}));
jest.mock('../api/queries/coaching', () => ({
  ...jest.requireActual('../api/queries/coaching'),
  useCoachingExpertsQuery: (groupId: string) => mockUseCoachingExpertsQuery(groupId),
  useSessionTypesQuery: (groupId: string) => mockUseSessionTypesQuery(groupId),
  useSlotsQuery: (groupId: string, expertId: string, sessionTypeId: string) =>
    mockUseSlotsQuery(groupId, expertId, sessionTypeId),
  useCreateBookingMutation: (groupId: string) => mockUseCreateBookingMutation(groupId),
}));

const mockBack = jest.fn();
const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: mockBack, replace: mockReplace }),
  Stack: { Screen: () => null },
}));

const mockShowToast = jest.fn();
jest.mock('../components/ui/z-toast', () => ({
  ...jest.requireActual('../components/ui/z-toast'),
  showToast: (...args: unknown[]) => mockShowToast(...args),
}));

import { initI18n } from '../i18n';
import BookScreen from '../app/book';
import type { CoachingExpert, CoachingSlot, SessionType } from '../api/queries/coaching';
import { BookingError } from '../api/queries/coaching';
import type { Group } from '../api/queries/groups';

beforeAll(() => initI18n('en'));

// ── test data ─────────────────────────────────────────────────────────────────
const GROUP_A: Group = { id: 'g1', name: 'Group Alpha' } as Group;
const EXPERT_1: CoachingExpert = { expert_id: 'e1', first_name: 'Alice', last_name: 'Smith' };
const TYPE_1: SessionType = {
  id: 't1',
  expert_id: 'e1',
  group_id: 'g1',
  name: 'Video review',
  description: 'Detailed feedback on an uploaded video.',
  duration_minutes: 30,
  is_active: true,
  created_at: '2026-01-01T00:00:00Z',
} as SessionType;
// Two slots on the same day so the date rail has one pill and the grid has two.
const DAY = '2026-06-18';
const SLOT_A: CoachingSlot = {
  expert_id: 'e1',
  starts_at: `${DAY}T16:00:00Z`,
  ends_at: `${DAY}T16:30:00Z`,
  duration_minutes: 30,
};
const SLOT_B: CoachingSlot = {
  expert_id: 'e1',
  starts_at: `${DAY}T16:45:00Z`,
  ends_at: `${DAY}T17:15:00Z`,
  duration_minutes: 30,
};

function ok<T>(data: T) {
  return { data, isPending: false, isError: false, refetch: jest.fn() } as const;
}
function pending() {
  return { data: undefined, isPending: true, isError: false, refetch: jest.fn() } as const;
}

function renderScreen() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return render(<BookScreen />, { wrapper });
}

beforeEach(() => {
  jest.clearAllMocks();
  // Single group → group step auto-skipped. Defaults: data present for all.
  mockUseGroupsQuery.mockReturnValue(ok<Group[]>([GROUP_A]));
  mockUseCoachingExpertsQuery.mockReturnValue(ok<CoachingExpert[]>([EXPERT_1]));
  mockUseSessionTypesQuery.mockReturnValue(ok<SessionType[]>([TYPE_1]));
  mockUseSlotsQuery.mockReturnValue(ok<CoachingSlot[]>([SLOT_A, SLOT_B]));
  mockMutateAsync.mockResolvedValue({});
  mockUseCreateBookingMutation.mockReturnValue({ mutateAsync: mockMutateAsync, isPending: false });
});
afterEach(cleanup);

// Walk Expert → Type → Time → Confirm, returning at the confirm step.
async function advanceToConfirm() {
  fireEvent.press(screen.getByTestId('book-expert-e1'));
  fireEvent.press(screen.getByTestId('book-bar-cta')); // Expert → Type
  fireEvent.press(screen.getByTestId('book-type-t1'));
  fireEvent.press(screen.getByTestId('book-bar-cta')); // Type → Time
  fireEvent.press(screen.getByTestId('book-daterail-0')); // pick the day
  fireEvent.press(screen.getByTestId(`book-time-${SLOT_A.starts_at}`)); // pick a time
  fireEvent.press(screen.getByTestId('book-bar-cta')); // Time → Confirm
}

test('renders the stepper and the expert step first (single group skips group step)', () => {
  renderScreen();
  expect(screen.getByTestId('book-stepper')).toBeTruthy();
  expect(screen.getByTestId('book-expert-e1')).toBeTruthy();
});

test('bar CTA is disabled until the current step is satisfied', () => {
  renderScreen();
  expect(screen.getByTestId('book-bar-cta').props.accessibilityState).toMatchObject({ disabled: true });
  fireEvent.press(screen.getByTestId('book-expert-e1'));
  expect(screen.getByTestId('book-bar-cta').props.accessibilityState).toMatchObject({ disabled: false });
});

test('expert step shows skeletons while loading', () => {
  mockUseCoachingExpertsQuery.mockReturnValue(pending());
  renderScreen();
  expect(screen.queryByTestId('book-expert-e1')).toBeNull();
});

test('full happy path books the session and shows success', async () => {
  renderScreen();
  await advanceToConfirm();
  expect(screen.getByTestId('book-submit') ?? screen.getByTestId('book-bar-cta')).toBeTruthy();
  await act(async () => {
    fireEvent.press(screen.getByTestId('book-bar-cta')); // Confirm → Book
  });
  await waitFor(() => expect(mockMutateAsync).toHaveBeenCalledWith({
    expertId: 'e1',
    sessionTypeId: 't1',
    scheduledAt: SLOT_A.starts_at,
    notes: undefined,
  }));
  await waitFor(() => expect(screen.getByTestId('book-success')).toBeTruthy());
  expect(mockShowToast).toHaveBeenCalled();
});

test('Fertig on success returns to coaching', async () => {
  renderScreen();
  await advanceToConfirm();
  await act(async () => { fireEvent.press(screen.getByTestId('book-bar-cta')); });
  await waitFor(() => expect(screen.getByTestId('book-success')).toBeTruthy());
  fireEvent.press(screen.getByTestId('book-view-sessions'));
  expect(mockReplace).toHaveBeenCalledWith('/coaching');
});

test('409 conflict clears the slot and shows the taken error', async () => {
  mockMutateAsync.mockRejectedValueOnce(new BookingError('conflict', 409));
  renderScreen();
  await advanceToConfirm();
  await act(async () => { fireEvent.press(screen.getByTestId('book-bar-cta')); });
  await waitFor(() => expect(screen.getByTestId('book-error')).toBeTruthy());
  expect(screen.queryByTestId('book-success')).toBeNull();
});

test('navigable stepper jumps back to the expert step', async () => {
  renderScreen();
  fireEvent.press(screen.getByTestId('book-expert-e1'));
  fireEvent.press(screen.getByTestId('book-bar-cta')); // now on Type step
  expect(screen.getByTestId('book-type-t1')).toBeTruthy();
  fireEvent.press(screen.getByLabelText('Select Expert')); // tap stepper step 0
  expect(screen.getByTestId('book-expert-e1')).toBeTruthy();
});

test('multiple groups show the group step first', () => {
  mockUseGroupsQuery.mockReturnValue(ok<Group[]>([GROUP_A, { id: 'g2', name: 'Group Beta' } as Group]));
  renderScreen();
  expect(screen.getByTestId('book-group-g1')).toBeTruthy();
  expect(screen.getByTestId('book-group-g2')).toBeTruthy();
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `wsl.exe -d ubuntu bash -lc 'cd ~/dev/projects/zeta/mobile && npx jest book-flow.test'`
Expected: FAIL — the old screen has no `book-bar-cta`/`book-daterail-*`/`book-time-*` testIDs.

- [ ] **Step 3: Rewrite the screen**

Replace the entire contents of `mobile/src/app/book.tsx` with:

```tsx
import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import type { CoachingExpert, CoachingSlot, SessionType } from '../api/queries/coaching';
import {
  BookingError,
  useCoachingExpertsQuery,
  useCreateBookingMutation,
  useSessionTypesQuery,
  useSlotsQuery,
} from '../api/queries/coaching';
import { queryClient } from '../api/query-client';
import { useGroupsQuery } from '../api/queries/groups';
import type { Group } from '../api/queries/groups';
import { avatarSrc, initialsFromName } from '../lib/avatar';
import { ZAvatar } from '../components/ui/z-avatar';
import { ZBadge } from '../components/ui/z-badge';
import { ZBookingBar } from '../components/ui/z-booking-bar';
import { ZButton } from '../components/ui/z-button';
import { ZCard } from '../components/ui/z-card';
import { ZDateRail } from '../components/ui/z-date-rail';
import type { ZDateRailDay } from '../components/ui/z-date-rail';
import { ZDivider } from '../components/ui/z-divider';
import { ZEmptyState } from '../components/ui/z-empty-state';
import { ZIconTile } from '../components/ui/z-icon-tile';
import { ZListItem } from '../components/ui/z-list-item';
import { ZQueryError } from '../components/ui/z-query-error';
import { ZScreen } from '../components/ui/z-screen';
import { ZSkeleton } from '../components/ui/z-skeleton';
import { ZStepper } from '../components/ui/z-stepper';
import type { ZStep } from '../components/ui/z-stepper';
import { ZSymbol } from '../components/ui/z-symbol';
import { ZTextarea } from '../components/ui/z-textarea';
import { ZTimeGrid } from '../components/ui/z-time-grid';
import type { ZTimeGridSlot } from '../components/ui/z-time-grid';
import { showToast } from '../components/ui/z-toast';
import { colors } from '../theme/colors';

type StageId = 'group' | 'expert' | 'type' | 'time' | 'confirm';

/**
 * Stepped coaching booking flow (UI-kit handoff "Session buchen").
 *
 * One decision per step: [Group → only if >1] Expert → Type → Time → Confirm.
 * A navigable ZStepper tracks progress and allows jumping back to reached steps;
 * a persistent ZBookingBar carries the single CTA (Next → Book). Group is
 * auto-selected (and the step skipped) when exactly one group exists.
 *
 * Schema reality (no price/icon on SessionType; no rating on CoachingExpert):
 * the summary headline is the session DURATION, type rows use one generic glyph,
 * and expert rows show avatar + name only.
 */
export default function BookScreen() {
  const { t } = useTranslation();
  const router = useRouter();

  // ── selection + flow state ──────────────────────────────────────────────────
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [expertId, setExpertId] = useState('');
  const [sessionTypeId, setSessionTypeId] = useState('');
  const [dayKey, setDayKey] = useState('');
  const [slot, setSlot] = useState<CoachingSlot | null>(null);
  const [notes, setNotes] = useState('');
  const [step, setStep] = useState(0);
  const [reached, setReached] = useState(0);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [booked, setBooked] = useState(false);

  // ── queries ───────────────────────────────────────────────────────────────
  const groupsQuery = useGroupsQuery();
  const groups: Group[] = groupsQuery.data ?? [];
  const groupId = groups.length === 1 ? groups[0].id : selectedGroupId;
  const hasGroupStage = groups.length > 1;

  const expertsQuery = useCoachingExpertsQuery(groupId);
  const sessionTypesQuery = useSessionTypesQuery(groupId);
  const slotsQuery = useSlotsQuery(groupId, expertId, sessionTypeId);
  const { mutateAsync, isPending: isSubmitting } = useCreateBookingMutation(groupId);

  // ── derived data ─────────────────────────────────────────────────────────
  const experts: CoachingExpert[] = expertsQuery.data ?? [];
  const allSessionTypes: SessionType[] = sessionTypesQuery.data ?? [];
  const sessionTypes = expertId
    ? allSessionTypes.filter((st) => st.expert_id === expertId)
    : [];
  const slots: CoachingSlot[] = slotsQuery.data ?? [];

  const selectedExpert = experts.find((e) => e.expert_id === expertId) ?? null;
  const selectedSessionType = sessionTypes.find((st) => st.id === sessionTypeId) ?? null;

  // ── stages ─────────────────────────────────────────────────────────────────
  const stages: StageId[] = hasGroupStage
    ? ['group', 'expert', 'type', 'time', 'confirm']
    : ['expert', 'type', 'time', 'confirm'];
  const stageId = stages[Math.min(step, stages.length - 1)];
  const stageIndex = (id: StageId) => stages.indexOf(id);

  // ── slots → days / grid ──────────────────────────────────────────────────
  const slotsByDay = slots.reduce<Map<string, CoachingSlot[]>>((acc, s) => {
    const key = new Date(s.starts_at).toDateString();
    acc.set(key, [...(acc.get(key) ?? []), s]);
    return acc;
  }, new Map());

  const todayKey = new Date().toDateString();
  const railDays: ZDateRailDay[] = Array.from(slotsByDay.keys()).map((key) => {
    const d = new Date(key);
    return {
      key,
      label: key === todayKey ? t('common.labels.today') : d.toLocaleDateString([], { weekday: 'short' }),
      day: String(d.getDate()),
      month: d.toLocaleDateString([], { month: 'short' }),
      isToday: key === todayKey,
    };
  });

  const daySlots = slotsByDay.get(dayKey) ?? [];
  const gridSlots: ZTimeGridSlot[] = daySlots.map((s) => ({
    startsAt: s.starts_at,
    label: formatTime(s.starts_at),
  }));

  // ── helpers ─────────────────────────────────────────────────────────────
  function formatDay(iso: string): string {
    return new Date(iso).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
  }
  function formatTime(iso: string): string {
    return new Date(iso).toLocaleTimeString([], { timeStyle: 'short' });
  }
  function formatRange(s: CoachingSlot): string {
    return `${formatTime(s.starts_at)} – ${formatTime(s.ends_at)}`;
  }

  // ── stepper ─────────────────────────────────────────────────────────────
  const stepLabels: Record<StageId, string> = {
    group: t('sessions.book.selectGroup'),
    expert: t('sessions.book.selectExpert'),
    type: t('sessions.book.sessionType'),
    time: t('sessions.book.selectTime'),
    confirm: t('common.actions.confirm'),
  };
  const stepperSteps: ZStep[] = stages.map((id, index) => ({
    label: stepLabels[id],
    state: index < step ? 'completed' : index === step ? 'active' : 'upcoming',
  }));

  function goStep(n: number) {
    const clamped = Math.max(0, Math.min(n, stages.length - 1));
    setStep(clamped);
    setReached((r) => Math.max(r, clamped));
  }
  function onStepPress(index: number) {
    if (index <= reached) setStep(index);
  }

  // ── selection handlers (reset cascade + clamp reached) ───────────────────
  function handleSelectGroup(id: string) {
    if (id === selectedGroupId) return;
    setSelectedGroupId(id);
    setExpertId('');
    setSessionTypeId('');
    setDayKey('');
    setSlot(null);
    setNotes('');
    setSubmitError(null);
    setReached(stageIndex('group'));
  }
  function handleSelectExpert(id: string) {
    setExpertId(id === expertId ? '' : id);
    setSessionTypeId('');
    setDayKey('');
    setSlot(null);
    setNotes('');
    setSubmitError(null);
    setReached(stageIndex('expert'));
  }
  function handleSelectType(id: string) {
    setSessionTypeId(id === sessionTypeId ? '' : id);
    setDayKey('');
    setSlot(null);
    setSubmitError(null);
    setReached(stageIndex('type'));
  }
  function handleSelectDay(key: string) {
    setDayKey(key);
    setSlot(null);
  }
  function handleSelectSlot(startsAt: string) {
    setSlot(daySlots.find((s) => s.starts_at === startsAt) ?? null);
  }

  // ── CTA gating ────────────────────────────────────────────────────────────
  const stageReady: Record<StageId, boolean> = {
    group: groupId !== '',
    expert: expertId !== '',
    type: sessionTypeId !== '',
    time: slot !== null,
    confirm: true,
  };
  const isConfirm = stageId === 'confirm';
  const canAdvance = stageReady[stageId];
  const ctaLabel = isConfirm ? t('sessions.book.bookSession') : t('common.actions.next');

  function handleCta() {
    if (isConfirm) void handleSubmit();
    else goStep(step + 1);
  }

  async function handleSubmit() {
    if (!expertId || !sessionTypeId || !slot) return;
    try {
      await mutateAsync({
        expertId,
        sessionTypeId,
        scheduledAt: slot.starts_at,
        notes: notes.trim() || undefined,
      });
      setBooked(true);
      showToast(t('sessions.book.bookedHeading'), t('sessions.book.bookedDescription'), 'success');
    } catch (err) {
      if (err instanceof BookingError && err.status === 409) {
        setSlot(null);
        void queryClient.invalidateQueries({ queryKey: ['coaching', groupId, 'slots'] });
        setSubmitError(t('sessions.book.slotTaken'));
      } else if (err instanceof BookingError && err.status === 400) {
        setSubmitError(t('sessions.book.tooLate'));
      } else {
        setSubmitError(t('sessions.book.failed'));
      }
    }
  }

  // ── booking-bar summary ─────────────────────────────────────────────────
  const headline = selectedSessionType
    ? t('common.labels.minutesShort', { count: selectedSessionType.duration_minutes })
    : undefined;
  const context = [
    selectedSessionType?.name,
    selectedExpert ? `${selectedExpert.first_name} ${selectedExpert.last_name}`.trim() : null,
    slot ? formatTime(slot.starts_at) : null,
  ]
    .filter(Boolean)
    .join(' · ');
  const hint = headline ? undefined : stepLabels[stageId];

  // ── stage body ────────────────────────────────────────────────────────────
  function renderStage() {
    switch (stageId) {
      case 'group':
        return (
          <View className="gap-2">
            <Text className="text-base font-semibold text-z-text">{t('sessions.book.selectGroup')}</Text>
            {groups.map((g) => (
              <ZListItem
                key={g.id}
                testID={`book-group-${g.id}`}
                title={g.name}
                selected={groupId === g.id}
                onPress={() => handleSelectGroup(g.id)}
              />
            ))}
          </View>
        );
      case 'expert':
        return (
          <View className="gap-2">
            <Text className="text-base font-semibold text-z-text">{t('sessions.book.selectExpert')}</Text>
            {expertsQuery.isPending ? (
              <View className="gap-2">
                <ZSkeleton className="h-16 w-full rounded-2xl" />
                <ZSkeleton className="h-16 w-full rounded-2xl" />
              </View>
            ) : expertsQuery.isError ? (
              <ZQueryError
                title={t('sessions.book.loadExpertsFailed')}
                onRetry={() => void expertsQuery.refetch()}
                testID="book-experts-retry"
              />
            ) : experts.length === 0 ? (
              <ZEmptyState title={t('sessions.book.noExperts')} description={t('sessions.book.noExpertsDescription')} />
            ) : (
              experts.map((e) => {
                const name = `${e.first_name} ${e.last_name}`.trim();
                return (
                  <ZListItem
                    key={e.expert_id}
                    testID={`book-expert-${e.expert_id}`}
                    leading={
                      <ZAvatar
                        size={44}
                        shape="circle"
                        image={e.avatar ? avatarSrc(e.avatar) : undefined}
                        fallback={initialsFromName(name)}
                        alt={name}
                      />
                    }
                    title={name}
                    selected={expertId === e.expert_id}
                    onPress={() => handleSelectExpert(e.expert_id)}
                  />
                );
              })
            )}
          </View>
        );
      case 'type':
        return (
          <View className="gap-2">
            <Text className="text-base font-semibold text-z-text">{t('sessions.book.sessionType')}</Text>
            {sessionTypesQuery.isPending ? (
              <View className="gap-2">
                <ZSkeleton className="h-20 w-full rounded-2xl" />
                <ZSkeleton className="h-20 w-full rounded-2xl" />
              </View>
            ) : sessionTypesQuery.isError ? (
              <ZQueryError
                title={t('sessions.book.loadSessionTypesFailed')}
                onRetry={() => void sessionTypesQuery.refetch()}
                testID="book-types-retry"
              />
            ) : sessionTypes.length === 0 ? (
              <ZEmptyState
                title={t('sessions.book.noSessionTypes')}
                description={t('sessions.book.noSessionTypesDescription')}
              />
            ) : (
              sessionTypes.map((st) => (
                <ZListItem
                  key={st.id}
                  testID={`book-type-${st.id}`}
                  leading={
                    <ZIconTile
                      tone={sessionTypeId === st.id ? 'primary' : 'neutral'}
                      icon={<ZSymbol name="video" label={st.name} size={20} color={colors.primary} />}
                    />
                  }
                  title={st.name}
                  titleAccessory={<ZBadge label={t('common.labels.minutesShort', { count: st.duration_minutes })} />}
                  subtitle={st.description}
                  selected={sessionTypeId === st.id}
                  onPress={() => handleSelectType(st.id)}
                />
              ))
            )}
          </View>
        );
      case 'time':
        return (
          <View className="gap-3">
            <Text className="text-base font-semibold text-z-text">{t('sessions.book.selectTime')}</Text>
            {slotsQuery.isPending ? (
              <View className="gap-3">
                <ZSkeleton className="h-16 w-full rounded-2xl" />
                <ZSkeleton className="h-24 w-full rounded-2xl" />
              </View>
            ) : slotsQuery.isError ? (
              <ZQueryError
                title={t('sessions.book.loadSlotsFailed')}
                onRetry={() => void slotsQuery.refetch()}
                testID="book-slots-retry"
              />
            ) : slots.length === 0 ? (
              <ZEmptyState title={t('sessions.book.noTimes')} description={t('sessions.book.noTimesDescription')} />
            ) : (
              <>
                <ZDateRail days={railDays} selectedKey={dayKey} onSelect={handleSelectDay} testID="book-daterail" />
                {dayKey === '' ? (
                  <Text className="text-sm text-z-muted">{t('sessions.book.selectDate')}</Text>
                ) : (
                  <ZTimeGrid
                    slots={gridSlots}
                    selectedStartsAt={slot?.starts_at ?? ''}
                    onSelect={handleSelectSlot}
                    hint={
                      selectedSessionType
                        ? t('common.labels.minutesShort', { count: selectedSessionType.duration_minutes })
                        : undefined
                    }
                    testID="book-time"
                  />
                )}
              </>
            )}
          </View>
        );
      case 'confirm':
        return (
          <View className="gap-4">
            <Text className="text-base font-semibold text-z-text">{t('sessions.book.confirmDescription')}</Text>
            {selectedExpert && selectedSessionType && slot ? (
              <ZCard className="gap-0">
                <View className="flex-row items-center gap-3 py-3">
                  <ZAvatar
                    size={40}
                    shape="circle"
                    image={selectedExpert.avatar ? avatarSrc(selectedExpert.avatar) : undefined}
                    fallback={initialsFromName(`${selectedExpert.first_name} ${selectedExpert.last_name}`.trim())}
                    alt={`${selectedExpert.first_name} ${selectedExpert.last_name}`.trim()}
                  />
                  <View className="flex-1">
                    <Text className="font-semibold text-z-text">{selectedSessionType.name}</Text>
                    <Text className="text-sm text-z-muted">
                      {`${selectedExpert.first_name} ${selectedExpert.last_name}`.trim()}
                    </Text>
                  </View>
                  <ZBadge
                    label={t('common.labels.minutesShort', { count: selectedSessionType.duration_minutes })}
                    tone="primary"
                  />
                </View>
                <ZDivider />
                <View className="py-3">
                  <Text className="text-z-text">{`${formatDay(slot.starts_at)} · ${formatRange(slot)}`}</Text>
                  <Text className="text-sm text-z-muted">{t('common.labels.yourLocalTime')}</Text>
                </View>
              </ZCard>
            ) : null}
            <ZTextarea
              testID="book-notes"
              value={notes}
              onChangeText={setNotes}
              accessibilityLabel={t('sessions.book.notes')}
              placeholder={t('sessions.book.notesPlaceholder')}
              rows={3}
            />
          </View>
        );
      default:
        return null;
    }
  }

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <ZScreen edges={['bottom']}>
      <Stack.Screen
        options={{
          title: t('sessions.bookLive'),
          headerLeft: () => (
            <ZButton
              testID="book-cancel"
              label={t('common.actions.cancel')}
              variant="ghost"
              onPress={() => router.back()}
            />
          ),
        }}
      />

      {booked ? (
        <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, flexGrow: 1, justifyContent: 'center' }}>
          <View testID="book-success" className="items-center gap-4">
            <View className="h-14 w-14 items-center justify-center rounded-2xl bg-z-success-soft">
              <ZSymbol name="check" label={t('sessions.book.bookedHeading')} size={28} color={colors.success} />
            </View>
            <Text className="text-center text-xl font-semibold text-z-text">{t('sessions.book.bookedHeading')}</Text>
            <Text className="max-w-md text-center text-sm leading-6 text-z-muted">
              {t('sessions.book.bookedDescription')}
            </Text>
            {selectedExpert && selectedSessionType && slot ? (
              <ZCard className="w-full flex-row items-center gap-3">
                <ZAvatar
                  size={44}
                  shape="circle"
                  image={selectedExpert.avatar ? avatarSrc(selectedExpert.avatar) : undefined}
                  fallback={initialsFromName(`${selectedExpert.first_name} ${selectedExpert.last_name}`.trim())}
                  alt={`${selectedExpert.first_name} ${selectedExpert.last_name}`.trim()}
                />
                <View className="flex-1">
                  <Text className="font-semibold text-z-text">{selectedSessionType.name}</Text>
                  <Text className="text-sm text-z-muted">{`${formatDay(slot.starts_at)} · ${formatTime(slot.starts_at)}`}</Text>
                </View>
                <ZBadge
                  label={t('common.labels.minutesShort', { count: selectedSessionType.duration_minutes })}
                  tone="primary"
                />
              </ZCard>
            ) : null}
            <ZButton
              testID="book-view-sessions"
              label={t('common.actions.done')}
              onPress={() => router.replace('/coaching')}
            />
          </View>
        </ScrollView>
      ) : groupsQuery.isPending ? (
        <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, gap: 12 }}>
          <ZSkeleton className="h-8 w-full rounded-full" />
          <ZSkeleton className="h-16 w-full rounded-2xl" />
          <ZSkeleton className="h-16 w-full rounded-2xl" />
        </ScrollView>
      ) : groupsQuery.isError ? (
        <View className="flex-1 p-4">
          <ZQueryError title={t('home.error.title')} onRetry={() => void groupsQuery.refetch()} testID="book-groups-retry" />
        </View>
      ) : groups.length === 0 ? (
        <View className="flex-1 justify-center p-4">
          <ZEmptyState title={t('groups.noGroupsYet')} description={t('groups.noGroupsJoined')} />
        </View>
      ) : (
        <>
          <ScrollView
            className="flex-1"
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ padding: 16, gap: 20 }}
          >
            <ZStepper steps={stepperSteps} reached={reached} onStepPress={onStepPress} testID="book-stepper" />
            {renderStage()}
            {submitError !== null ? (
              <Text testID="book-error" className="text-sm text-z-danger">
                {submitError}
              </Text>
            ) : null}
          </ScrollView>
          <ZBookingBar
            testID="book-bar"
            headline={headline}
            hint={hint}
            context={context}
            ctaLabel={ctaLabel}
            ctaDisabled={!canAdvance}
            ctaLoading={isSubmitting}
            onPress={handleCta}
          />
        </>
      )}
    </ZScreen>
  );
}
```

- [ ] **Step 4: Run the flow test to verify it passes**

Run: `wsl.exe -d ubuntu bash -lc 'cd ~/dev/projects/zeta/mobile && npx jest book-flow.test'`
Expected: PASS (all flow tests). If a test references a label that differs from the i18n value, fix the test's expected string to match `mobile/src/i18n/locales/en.json` — do not invent keys.

- [ ] **Step 5: Verify `colors.success` exists (used by the success glyph)**

Run: `wsl.exe -d ubuntu bash -lc 'cd ~/dev/projects/zeta && grep -nE "success" mobile/src/theme/colors.ts'`
Expected: a `success:` entry. If absent, use `colors.primary` and `bg-z-primary-soft` for the success glyph tile instead.

- [ ] **Step 6: Commit**

```bash
git add mobile/src/app/book.tsx mobile/src/__tests__/book-flow.test.tsx
git commit -m "feat(mobile): rebuild booking flow as stepped flow from UI-kit handoff"
```

---

## Task 7: Green gate + device sign-off

**Files:** none (verification only).

- [ ] **Step 1: Lint**

Run: `wsl.exe -d ubuntu bash -lc 'cd ~/dev/projects/zeta && make mobile:lint'`
Expected: no errors. Fix any reported issues in the touched files.

- [ ] **Step 2: Typecheck (includes `.types.ts` + platform files)**

Run: `wsl.exe -d ubuntu bash -lc 'cd ~/dev/projects/zeta && make mobile:typecheck'`
Expected: no type errors.

- [ ] **Step 3: Full test suite**

Run: `wsl.exe -d ubuntu bash -lc 'cd ~/dev/projects/zeta && make mobile:test'`
Expected: all suites pass. If `make` exits non-zero due to a Jest worker-teardown flake, re-confirm with `wsl.exe -d ubuntu bash -lc 'cd ~/dev/projects/zeta/mobile && npx jest'` and trust the summary line (`Tests: N passed`).

- [ ] **Step 4: Device screenshots (sign-off, not optional)**

Build/run the iOS and Android dev clients, open the booking flow (Sessions → "Book Live Coaching"), and capture each step (Expert · Type · Time with the date rail + time grid · Confirm · Success) on **both** platforms. Attach to the PR description (mobile UI changes require both-platform screenshots; green gates ≠ done — handoff visual-fidelity rule).

- [ ] **Step 5: Final commit (if any lint/type fixes were made)**

```bash
git add -u mobile/src
git commit -m "chore(mobile): lint/type fixes for booking flow redesign"
```

---

## Self-review notes (addressed)

- **Spec coverage:** stepped flow (Task 6), navigable stepper (Task 2), `ZDateRail`/`ZTimeGrid`/`ZBookingBar` (Tasks 3–5), Expert→Type order + group auto-skip (Task 6 stages), duration headline + generic type glyph + avatar/name expert rows (Task 6), empty days omitted (rail built from `slotsByDay` keys), enriched success + Fertig (Task 6), four query states (Task 6), 409/400 handling (Task 6), i18n `today` (Task 1), tests + stories (each task), green gate + screenshots (Task 7). Dropped scope (first-available, price backend, add-to-calendar) intentionally absent.
- **Type consistency:** `ZDateRailDay`/`ZTimeGridSlot`/`ZBookingBarProps` names and the `reached` prop are used identically in primitives and screen. `handleSelectDay`/`handleSelectSlot`/`handleSelectType`/`handleSelectExpert`/`handleSelectGroup` are all defined and referenced.
- **No placeholders:** every code step contains complete code; every command has an expected result.
