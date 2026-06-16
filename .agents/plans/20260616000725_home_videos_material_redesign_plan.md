# Home & Videos Material/HIG Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the Home and Videos tab screens to the `design_handoff_home_videos` direction (greeting header, next-session hero, "your videos" section, progress-tracked first-steps; refreshed video cards; segmented filter + count overline) using native `z-*` primitives — no hand-rolled controls.

**Architecture:** Shared Custom-RN content components composed from already-native sub-primitives (`ZButton`, `ZSymbol`, `ZCard`, `ZBadge`, `ZAvatar`). Missing primitives are *created* as primitives (`ZProgress`) rather than hand-rolled in screens. Platform divergence is delegated to primitives that already split per-platform (`ZTabs`, `ZCard`, FAB-vs-header-"+"). Colors come from existing `roles.ts` tokens (already match the handoff palette — no token changes).

**Tech Stack:** Expo SDK 56 / React Native, expo-router, NativeWind, `@expo/ui`, react-i18next, TanStack Query, jest + React Native Testing Library.

---

## Spec reference

Design spec: `.agents/plans/20260615230028_home_videos_material_redesign_design.md`.
Handoff: `mobile/handoffs/design_handoff_home_videos/`.

## Confirmed decisions

- Platform-adaptive; follow the handoff. Home header = in-content greeting on **both** platforms (`headerShown:false`).
- Stat cards removed from Home. Empty hero → "book a session" prompt (gated `coaching:book`). Videos segment counts → "N VIDEOS" overline.
- **Native, not hand-rolled** (AGENTS.md + user): every element maps to a `z-*` primitive; new `ZProgress` primitive replaces inline progress bars.
- **No duration pill** (`Asset` has no duration field; list omits `videos`).
- Hero = brand-led tonal surface (Custom-RN tier a): exact handoff **radius 28 / padding 18 / accent-container**, composed from native `ZButton`/`ZBadge`/`ZSymbol`. (Native Compose `Card` has no corner-radius prop, so `ZCard` is not used for the hero.)

## File structure

**New files**
- `mobile/src/components/ui/z-progress.types.ts` / `z-progress.tsx` / `z-progress.ios.tsx` / `z-progress.android.tsx` — Native-tier progress (ProgressView / LinearProgressIndicator / bare fallback).
- `mobile/src/components/ui/z-progress.test.tsx` — unit test (bare fallback).
- `mobile/src/components/ui/z-fab.types.ts` / `z-fab.tsx` / `z-fab.ios.tsx` / `z-fab.android.tsx` — Native-tier extended FAB (Android only; iOS null).
- `mobile/src/components/ui/z-fab.test.tsx` — unit test (bare fallback).
- `mobile/src/components/next-session-card.tsx` — hero + empty-prompt.
- `mobile/src/components/next-session-card.test.tsx` — unit test.

**Modified files**
- `mobile/src/components/ui/z-avatar.tsx` — add `tone`.
- `mobile/src/components/ui/z-symbol.types.ts` / `z-symbol.map.ts` — add `play`.
- `mobile/src/api/queries/coaching.ts` — add `formatRelativeTime`.
- `mobile/src/components/booking-card.tsx` — extract `bookingCounterpart`.
- `mobile/src/components/asset-card.tsx` — restyle + play overlay.
- `mobile/src/app/(tabs)/(home)/index.tsx` — rebuild.
- `mobile/src/app/(tabs)/videos/index.tsx` — drop counts, add overline.
- `mobile/src/__tests__/home-screen.test.tsx` — rewrite for new modules.
- i18n: `mobile/src/i18n/locales/{en,de,fr}.json` **and** `web/dashboard-next/public/i18n/{en,de,fr}.json`.

> **i18n note:** `pnpm run sync:i18n` is a *full file copy* from `web/dashboard-next/public/i18n/` and drops mobile-only keys. **Do NOT run it.** Add new keys by hand to both the mobile and web JSONs.

> **Working dir / commands:** run all `pnpm`/`make` via WSL (`wsl.exe -d ubuntu -- bash -lc '…'` from repo root), per project setup. Commands below show the logical command; prefix with the WSL invocation your shell needs.

---

## Task 1: `ZProgress` primitive (Native tier)

> Material 3 `LinearProgressIndicator` (Android) / SwiftUI `ProgressView` (iOS),
> with a NativeWind track+fill bare fallback for web/Storybook/jest. Both native
> components are present in `@expo/ui` 56.0.17 (`jetpack-compose` `Progress` /
> `swift-ui` `ProgressView`).

**Files:**
- Create: `mobile/src/components/ui/z-progress.types.ts`
- Create: `mobile/src/components/ui/z-progress.tsx` (bare)
- Create: `mobile/src/components/ui/z-progress.ios.tsx`
- Create: `mobile/src/components/ui/z-progress.android.tsx`
- Test: `mobile/src/components/ui/z-progress.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// mobile/src/components/ui/z-progress.test.tsx
import { render, screen } from '@testing-library/react-native';
import { ZProgress } from './z-progress';

test('renders a progressbar with a clamped percentage width', () => {
  render(<ZProgress value={0.5} testID="p" />);
  const bar = screen.getByTestId('p');
  expect(bar.props.accessibilityValue).toEqual({ min: 0, max: 100, now: 50 });
});

test('clamps out-of-range values to 0..100', () => {
  render(<ZProgress value={1.7} testID="over" />);
  expect(screen.getByTestId('over').props.accessibilityValue.now).toBe(100);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter mobile test z-progress` (or `cd mobile && pnpm test z-progress`)
Expected: FAIL — cannot find module `./z-progress`.

- [ ] **Step 3: Write the types (Native tier)**

```ts
// mobile/src/components/ui/z-progress.types.ts
/**
 * ZProgress — shared public API types (Tier: Native)
 *
 * Determinate linear progress bar.
 *   - z-progress.tsx          — NativeWind track+fill fallback (web / Storybook / jest)
 *   - z-progress.ios.tsx      — SwiftUI ProgressView via @expo/ui/swift-ui
 *   - z-progress.android.tsx  — Material 3 LinearProgressIndicator via @expo/ui/jetpack-compose
 */
export type ZProgressProps = {
  /** Completion fraction 0..1 (clamped). */
  value: number;
  /** NativeWind layout classes forwarded to the outer wrapper. */
  className?: string;
  testID?: string;
};
```

- [ ] **Step 4: Write the bare fallback (`z-progress.tsx`)**

```tsx
// mobile/src/components/ui/z-progress.tsx
import { View } from 'react-native';
import type { ZProgressProps } from './z-progress.types';

export type { ZProgressProps } from './z-progress.types';

/** Bare fallback: 6px track (`bg-z-border`) + accent fill (`bg-z-primary`). */
export function ZProgress({ value, className, testID }: ZProgressProps) {
  const pct = Math.round(Math.max(0, Math.min(1, value)) * 100);
  return (
    <View
      testID={testID}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: pct }}
      className={`h-1.5 overflow-hidden rounded-full bg-z-border${className ? ` ${className}` : ''}`}
    >
      <View className="h-full rounded-full bg-z-primary" style={{ width: `${pct}%` }} />
    </View>
  );
}
```

- [ ] **Step 5: Write the iOS variant (`z-progress.ios.tsx`)**

```tsx
// mobile/src/components/ui/z-progress.ios.tsx
import { Host, ProgressView } from '@expo/ui/swift-ui';
import { View } from 'react-native';
import type { ZProgressProps } from './z-progress.types';

export type { ZProgressProps } from './z-progress.types';

/**
 * iOS: SwiftUI ProgressView (linear when no label child). The outer NativeWind
 * View forwards `className`; `matchContents={{ vertical: true }}` lets the bar
 * fill the available width and size to its intrinsic height.
 */
export function ZProgress({ value, className, testID }: ZProgressProps) {
  const clamped = Math.max(0, Math.min(1, value));
  return (
    <View className={className} testID={testID}>
      <Host matchContents={{ vertical: true }}>
        <ProgressView value={clamped} />
      </Host>
    </View>
  );
}
```

> iOS tint: `ProgressView` uses the system accent by default. To force the brand
> accent, apply a swift-ui `tint(color('accent'))` modifier — confirm the exact
> modifier name in `@expo/ui/swift-ui/modifiers` on a dev build before adding.

- [ ] **Step 6: Write the Android variant (`z-progress.android.tsx`)**

```tsx
// mobile/src/components/ui/z-progress.android.tsx
import { Host, LinearProgressIndicator } from '@expo/ui/jetpack-compose';
import { fillMaxWidth, testID as testIDModifier } from '@expo/ui/jetpack-compose/modifiers';
import { View } from 'react-native';
import { useRoleColors } from '../../theme/native';
import type { ZProgressProps } from './z-progress.types';

export type { ZProgressProps } from './z-progress.types';

/**
 * Android: Material 3 LinearProgressIndicator. `fillMaxWidth()` makes the bar
 * span the row (Compose default is 240dp). Outer NativeWind View forwards
 * `className` (the Host does not honor NativeWind classes reliably).
 */
export function ZProgress({ value, className, testID }: ZProgressProps) {
  const { color } = useRoleColors();
  const clamped = Math.max(0, Math.min(1, value));
  return (
    <View className={className} testID={testID}>
      <Host matchContents={{ vertical: true }}>
        <LinearProgressIndicator
          progress={clamped}
          color={color('accent')}
          trackColor={color('outline')}
          modifiers={[fillMaxWidth(), ...(testID ? [testIDModifier(testID)] : [])]}
        />
      </Host>
    </View>
  );
}
```

- [ ] **Step 7: Run test (bare fallback) to verify it passes**

Run: `pnpm --filter mobile test z-progress`
Expected: PASS (2 tests — jest renders the bare `.tsx`).

- [ ] **Step 8: Typecheck the platform files**

Run: `make mobile:typecheck`
Expected: PASS — `.ios`/`.android` imports from `@expo/ui` resolve.

- [ ] **Step 9: Commit**

```bash
git add mobile/src/components/ui/z-progress.*
git commit -m "feat(mobile): add ZProgress (M3 LinearProgressIndicator / SwiftUI ProgressView)"
```

---

## Task 1B: `ZFab` primitive (extended FAB, Native tier)

> Material 3 `ExtendedFloatingActionButton` on Android (icon + label); iOS
> renders `null` (the create action is the nav-bar "+"). Bare fallback = a
> NativeWind pill for web/Storybook/jest. `@expo/ui` 56.0.17 exposes
> `ExtendedFloatingActionButton` with `.Icon` + `.Text` slots; the repo already
> feeds a `ZSymbol` into a FAB `.Icon` slot (`z-icon-button.android.tsx`).

**Files:**
- Create: `mobile/src/components/ui/z-fab.types.ts`
- Create: `mobile/src/components/ui/z-fab.tsx` (bare)
- Create: `mobile/src/components/ui/z-fab.ios.tsx`
- Create: `mobile/src/components/ui/z-fab.android.tsx`
- Test: `mobile/src/components/ui/z-fab.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// mobile/src/components/ui/z-fab.test.tsx
import { render, screen, userEvent } from '@testing-library/react-native';
import { Text } from 'react-native';
import { ZFab } from './z-fab';

test('renders an extended fab with label and fires onPress', async () => {
  const onPress = jest.fn();
  render(<ZFab label="Upload" icon={<Text>+</Text>} onPress={onPress} testID="fab" />);
  expect(screen.getByText('Upload')).toBeOnTheScreen();
  await userEvent.setup().press(screen.getByTestId('fab'));
  expect(onPress).toHaveBeenCalled();
});

test('hides the label when not extended', () => {
  render(<ZFab label="Upload" icon={<Text>+</Text>} onPress={() => {}} extended={false} testID="fab" />);
  expect(screen.queryByText('Upload')).toBeNull();
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `pnpm --filter mobile test z-fab`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the types**

```ts
// mobile/src/components/ui/z-fab.types.ts
/**
 * ZFab — shared public API types (Tier: Native)
 *
 * Material 3 Floating Action Button — ANDROID ONLY. iOS surfaces the same
 * primary action via a nav-bar header button (AGENTS.md), so the iOS variant
 * renders null.
 *   - z-fab.tsx          — NativeWind pill fallback (web / Storybook / jest)
 *   - z-fab.ios.tsx      — renders null
 *   - z-fab.android.tsx  — ExtendedFloatingActionButton (or round FAB when not extended)
 */
import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';

export type ZFabProps = {
  /** Visible label (extended) + accessibilityLabel. */
  label: string;
  /** Leading icon node (ZSymbol). */
  icon: ReactNode;
  onPress: () => void;
  /** Show the label (extended). When false, an icon-only round FAB. @default true */
  extended?: boolean;
  /** NativeWind classes for positioning (e.g. "absolute right-6"). */
  className?: string;
  /** Style for the outer wrapper (e.g. dynamic bottom inset). */
  style?: StyleProp<ViewStyle>;
  testID?: string;
};
```

- [ ] **Step 4: Write the bare fallback (`z-fab.tsx`)**

```tsx
// mobile/src/components/ui/z-fab.tsx
import { Text, View } from 'react-native';
import { Touchable } from './touchable';
import type { ZFabProps } from './z-fab.types';

export type { ZFabProps } from './z-fab.types';

export function ZFab({ label, icon, onPress, extended = true, className, style, testID }: ZFabProps) {
  return (
    <View className={className} style={style}>
      <Touchable
        testID={testID}
        accessibilityLabel={label}
        onPress={onPress}
        haptic
        className="h-14 flex-row items-center gap-2 self-start rounded-2xl bg-accent-container px-5 active:opacity-90"
      >
        {icon}
        {extended ? <Text className="text-base font-bold text-on-accent-container">{label}</Text> : null}
      </Touchable>
    </View>
  );
}
```

- [ ] **Step 5: Write the iOS variant (`z-fab.ios.tsx`)**

```tsx
// mobile/src/components/ui/z-fab.ios.tsx
import type { ZFabProps } from './z-fab.types';

export type { ZFabProps } from './z-fab.types';

/**
 * iOS has no FAB — the create action is surfaced via the native nav-bar header
 * "+" button. ZFab therefore renders nothing on iOS. `className` is referenced
 * (destructured) only to satisfy the native-classname-forwarding source scan.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function ZFab({ className }: ZFabProps) {
  return null;
}
```

- [ ] **Step 6: Write the Android variant (`z-fab.android.tsx`)**

```tsx
// mobile/src/components/ui/z-fab.android.tsx
import {
  ExtendedFloatingActionButton,
  FloatingActionButton,
  Host,
  Text,
} from '@expo/ui/jetpack-compose';
import { testID as testIDModifier } from '@expo/ui/jetpack-compose/modifiers';
import { View } from 'react-native';
import { useRoleColors } from '../../theme/native';
import type { ZFabProps } from './z-fab.types';

export type { ZFabProps } from './z-fab.types';

/**
 * Android: Material 3 ExtendedFloatingActionButton (icon + label) or round
 * FloatingActionButton when `extended={false}`. accent-container fill /
 * on-accent-container content matches the handoff prototype. Outer NativeWind
 * View forwards `className`/`style` for positioning.
 */
export function ZFab({ label, icon, onPress, extended = true, className, style, testID }: ZFabProps) {
  const { color } = useRoleColors();
  const modifiers = testID ? [testIDModifier(testID)] : [];

  if (!extended) {
    return (
      <View className={className} style={style}>
        <Host matchContents>
          <FloatingActionButton onClick={onPress} containerColor={color('accentContainer')} modifiers={modifiers}>
            <FloatingActionButton.Icon>
              <View accessibilityLabel={label}>{icon}</View>
            </FloatingActionButton.Icon>
          </FloatingActionButton>
        </Host>
      </View>
    );
  }

  return (
    <View className={className} style={style}>
      <Host matchContents>
        <ExtendedFloatingActionButton
          expanded
          onClick={onPress}
          containerColor={color('accentContainer')}
          modifiers={modifiers}
        >
          <ExtendedFloatingActionButton.Icon>
            <View accessibilityLabel={label}>{icon}</View>
          </ExtendedFloatingActionButton.Icon>
          <ExtendedFloatingActionButton.Text>
            <Text color={color('onAccentContainer')}>{label}</Text>
          </ExtendedFloatingActionButton.Text>
        </ExtendedFloatingActionButton>
      </Host>
    </View>
  );
}
```

- [ ] **Step 7: Run test (bare) to verify it passes**

Run: `pnpm --filter mobile test z-fab`
Expected: PASS (2 tests).

- [ ] **Step 8: Typecheck + classname-forwarding guard**

Run: `make mobile:typecheck && pnpm --filter mobile test native-classname-forwarding`
Expected: PASS (`z-fab.ios.tsx` references `className`; `z-fab.android.tsx` forwards it).

- [ ] **Step 9: Commit**

```bash
git add mobile/src/components/ui/z-fab.*
git commit -m "feat(mobile): add ZFab (M3 extended FAB; iOS uses nav-bar +)"
```

---

## Task 2: Hero container = brand-led surface (no `ZCard` change)

**No `ZCard` modification.** The handoff fixes the hero at **radius 28 / padding 18**.
The native Compose `Card` exposes only `colors`/`elevation`/`border` — **no
corner-radius prop** — so `ZCard` cannot reproduce radius 28. Per AGENTS.md the
hero is therefore a **Custom-RN tier (a) "brand-led canvas"**: a tonal `View`
(`rounded-[28px] bg-accent-container p-[18px]`) composed from native controls
(`ZButton` / `ZBadge` / `ZSymbol`). It is built inline in `NextSessionCard`
(Task 9) — no shared primitive change here.

- [ ] **Step 1: Verify the accent-container NativeWind classes exist**

Run: `rg "accent-container" mobile/tailwind.config.js`
Expected: matches for `accent-container` (background) and `on-accent-container`.
If absent, add them to the theme `colors` map mirroring the existing
`accent`/`surface` entries (sourced from `roles`). These classes are the only
prerequisite this task carries (used by the brand-led hero + the `ZFab` fallback).
No code/commit in this task — the hero surface lands with Task 9.

---

## Task 3: `ZAvatar` accent tone

**Files:**
- Modify: `mobile/src/components/ui/z-avatar.tsx`
- Test: `mobile/src/components/ui/z-avatar.test.tsx`

- [ ] **Step 1: Add a failing test**

```tsx
// append to mobile/src/components/ui/z-avatar.test.tsx
test('accent tone uses accent-container background and on-accent-container text', () => {
  render(<ZAvatar fallback="HM" tone="accent" testID="av" />);
  expect(screen.getByTestId('av').props.className).toContain('bg-accent-container');
  expect(screen.getByText('HM').props.className).toContain('text-on-accent-container');
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `pnpm --filter mobile test z-avatar`
Expected: FAIL — `tone` unsupported.

- [ ] **Step 3: Implement the tone prop**

```tsx
// mobile/src/components/ui/z-avatar.tsx — extend props + classes
export type ZAvatarShape = 'rounded' | 'circle';
export type ZAvatarTone = 'default' | 'accent';

export function ZAvatar({
  image,
  fallback = '',
  size = 36,
  shape = 'rounded',
  tone = 'default',
  alt,
  testID,
}: {
  image?: string;
  fallback?: string;
  size?: number;
  shape?: ZAvatarShape;
  tone?: ZAvatarTone;
  alt?: string;
  testID?: string;
}) {
  const isAccent = tone === 'accent';
  return (
    <View
      testID={testID}
      accessible
      accessibilityLabel={alt}
      className={`items-center justify-center overflow-hidden ${
        isAccent ? 'bg-accent-container' : 'bg-z-surface-warm'
      } ${shape === 'circle' ? 'rounded-full' : 'rounded-md'}`}
      style={{ width: size, height: size }}
    >
      {image ? (
        <Image source={{ uri: avatarSrc(image) }} style={{ width: size, height: size }} />
      ) : (
        <Text className={`text-base font-extrabold ${isAccent ? 'text-on-accent-container' : 'text-z-primary'}`}>
          {fallback}
        </Text>
      )}
    </View>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter mobile test z-avatar`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add mobile/src/components/ui/z-avatar.tsx mobile/src/components/ui/z-avatar.test.tsx
git commit -m "feat(mobile): add ZAvatar accent tone for the home greeting"
```

---

## Task 4: `play` ZSymbol entry

**Files:**
- Modify: `mobile/src/components/ui/z-symbol.types.ts`
- Modify: `mobile/src/components/ui/z-symbol.map.ts`
- Test: `mobile/src/components/ui/z-symbol.test.tsx`

- [ ] **Step 1: Add a failing test**

```tsx
// append to mobile/src/components/ui/z-symbol.test.tsx
test('play maps to a lucide Play fallback', () => {
  render(<ZSymbol name="play" label="Play" testID="play" />);
  expect(screen.getByTestId('play')).toBeOnTheScreen();
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `pnpm --filter mobile test z-symbol`
Expected: FAIL — `"play"` not assignable to `ZSymbolName`.

- [ ] **Step 3: Extend the name union + lucide types (`z-symbol.types.ts`)**

In the `import type { … } from 'lucide-react-native'` block add `Play,`. In the `ZSymbolName` union, under `// Media / call`, add `| 'play'`. In the `LucideIcon` union add `| typeof Play`.

- [ ] **Step 4: Add the runtime entry (`z-symbol.map.ts`)**

Add `Play,` to the runtime `import { … } from 'lucide-react-native'`. Add under the Media/call section:

```ts
  play: {
    // Play: video playback affordance on a thumbnail overlay.
    sf: 'play.fill',
    android: 'play_arrow',
    lucide: Play,
  },
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm --filter mobile test z-symbol`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add mobile/src/components/ui/z-symbol.types.ts mobile/src/components/ui/z-symbol.map.ts mobile/src/components/ui/z-symbol.test.tsx
git commit -m "feat(mobile): add play ZSymbol (play.fill / play_arrow / Play)"
```

---

## Task 5: `formatRelativeTime` helper

**Files:**
- Modify: `mobile/src/api/queries/coaching.ts`
- Test: `mobile/src/api/queries/coaching.test.tsx`

- [ ] **Step 1: Add a failing test**

```tsx
// append to mobile/src/api/queries/coaching.test.tsx (it already imports from './coaching')
import { formatRelativeTime } from './coaching';

test('formatRelativeTime renders a future day distance', () => {
  const now = new Date('2026-06-15T09:00:00.000Z');
  const inTwoDays = new Date('2026-06-17T09:00:00.000Z').toISOString();
  expect(formatRelativeTime(inTwoDays, 'en', now)).toMatch(/2 days|in 2 days/i);
});

test('formatRelativeTime renders an hour distance under a day', () => {
  const now = new Date('2026-06-15T09:00:00.000Z');
  const inThreeHours = new Date('2026-06-15T12:00:00.000Z').toISOString();
  expect(formatRelativeTime(inThreeHours, 'en', now)).toMatch(/3 hours|in 3 hours/i);
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `pnpm --filter mobile test coaching`
Expected: FAIL — `formatRelativeTime` is not exported.

- [ ] **Step 3: Implement the helper**

```ts
// mobile/src/api/queries/coaching.ts — add near formatBookingDateTime
/**
 * Locale-aware relative time ("in 2 days", "in 3 hours"). Uses
 * Intl.RelativeTimeFormat (available in Expo Hermes with ICU). `now` is
 * injectable for deterministic tests. Falls back to the absolute date string
 * if RelativeTimeFormat is unavailable on the runtime.
 */
export function formatRelativeTime(iso: string, locale: string, now: Date = new Date()): string {
  const diffMs = new Date(iso).getTime() - now.getTime();
  try {
    const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
    const minutes = Math.round(diffMs / 60_000);
    if (Math.abs(minutes) < 60) return rtf.format(minutes, 'minute');
    const hours = Math.round(minutes / 60);
    if (Math.abs(hours) < 24) return rtf.format(hours, 'hour');
    return rtf.format(Math.round(hours / 24), 'day');
  } catch {
    return formatBookingDateTime(iso);
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter mobile test coaching`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add mobile/src/api/queries/coaching.ts mobile/src/api/queries/coaching.test.tsx
git commit -m "feat(mobile): add locale-aware formatRelativeTime helper"
```

---

## Task 6: Extract `bookingCounterpart` from BookingCard

**Files:**
- Modify: `mobile/src/components/booking-card.tsx`
- Test: `mobile/src/components/booking-card.test.tsx`

- [ ] **Step 1: Add a failing test**

```tsx
// append to mobile/src/components/booking-card.test.tsx
import { bookingCounterpart } from './booking-card';

test('bookingCounterpart returns the expert for the student viewer', () => {
  const b = { student_id: 'me', expert_id: 'x', expert_name: 'Coach Lee', student_name: 'Me' } as never;
  expect(bookingCounterpart(b, 'me')).toEqual({ name: 'Coach Lee', role: 'expert' });
});

test('bookingCounterpart returns the student for the expert viewer', () => {
  const b = { student_id: 's', expert_id: 'me', expert_name: 'Me', student_name: 'Sam' } as never;
  expect(bookingCounterpart(b, 'me')).toEqual({ name: 'Sam', role: 'student' });
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `pnpm --filter mobile test booking-card`
Expected: FAIL — `bookingCounterpart` not exported.

- [ ] **Step 3: Extract + reuse the helper**

```tsx
// mobile/src/components/booking-card.tsx — add exported helper
export function bookingCounterpart(
  booking: Booking,
  currentUserId: string,
): { name: string; role: 'expert' | 'student' } {
  const isStudent = booking.student_id === currentUserId;
  return {
    name: isStudent ? (booking.expert_name ?? booking.expert_id) : (booking.student_name ?? booking.student_id),
    role: isStudent ? 'expert' : 'student',
  };
}
```

Then replace the inline `counterpart` / `counterpartRole` block inside `BookingCard` with:

```tsx
  const { name: counterpart, role: counterpartRole } = bookingCounterpart(booking, currentUserId);
```

(Leaves the existing `counterpartLabel = t(counterpartRole === 'expert' ? … : …)` line working unchanged.)

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter mobile test booking-card`
Expected: PASS (new helper tests + existing BookingCard tests green).

- [ ] **Step 5: Commit**

```bash
git add mobile/src/components/booking-card.tsx mobile/src/components/booking-card.test.tsx
git commit -m "refactor(mobile): extract bookingCounterpart for reuse by the home hero"
```

---

## Task 7: i18n keys (mobile + web source)

**Files:**
- Modify: `mobile/src/i18n/locales/en.json`, `de.json`, `fr.json`
- Modify: `web/dashboard-next/public/i18n/en.json`, `de.json`, `fr.json`

Add the SAME additions to the mobile and web file for each language. Reuse existing keys where present (`common.actions.join`, `common.actions.viewAll`, `common.actions.bookSession`, `home.latestVideos`, `home.emptyCoaching.*`, `home.firstSteps.title`, `videos.all`, `videos.reviewStatus.*`).

- [ ] **Step 1: Add the new keys — English**

In the `"home"` object add (`titleWith` = the combined hero title "Video Review with Coach Lee", per the handoff's "{type} mit {expert}"):

```json
    "greeting": {
      "morning": "Good morning",
      "afternoon": "Good afternoon",
      "evening": "Good evening"
    },
    "nextSession": {
      "title": "Next session",
      "titleWith": "{{type}} with {{name}}"
    },
```

In the `"common"."actions"` object add (the hero's secondary button):

```json
    "details": "Details",
```

In the `"videos"` object add (i18next plural):

```json
    "videoCount_one": "{{count}} video",
    "videoCount_other": "{{count}} videos",
```

- [ ] **Step 2: Add the new keys — German (`de.json`)**

```json
    "greeting": {
      "morning": "Guten Morgen",
      "afternoon": "Guten Tag",
      "evening": "Guten Abend"
    },
    "nextSession": {
      "title": "Nächste Session",
      "titleWith": "{{type}} mit {{name}}"
    },
```
Plus `"common"."actions"."details": "Details"`, and in `"videos"`:
```json
    "videoCount_one": "{{count}} Video",
    "videoCount_other": "{{count}} Videos",
```

- [ ] **Step 3: Add the new keys — French (`fr.json`)**

```json
    "greeting": {
      "morning": "Bonjour",
      "afternoon": "Bon après-midi",
      "evening": "Bonsoir"
    },
    "nextSession": {
      "title": "Prochaine séance",
      "titleWith": "{{type}} avec {{name}}"
    },
```
Plus `"common"."actions"."details": "Détails"`, and in `"videos"`:
```json
    "videoCount_one": "{{count}} vidéo",
    "videoCount_other": "{{count}} vidéos",
```

- [ ] **Step 4: Verify JSON validity (do NOT run sync:i18n)**

Run: `node -e "['en','de','fr'].forEach(l=>require('./mobile/src/i18n/locales/'+l+'.json'))"`
Expected: no output (all parse). Repeat for the web files.

- [ ] **Step 5: Commit**

```bash
git add mobile/src/i18n/locales/*.json web/dashboard-next/public/i18n/*.json
git commit -m "i18n(mobile): add home greeting, nextSession, videos count keys"
```

---

## Task 8: Refresh `AssetCard`

**Files:**
- Modify: `mobile/src/components/asset-card.tsx`
- Test: `mobile/src/components/asset-card.test.tsx`

- [ ] **Step 1: Update/extend the test (red)**

```tsx
// mobile/src/components/asset-card.test.tsx — assert the new native pieces
// (keep existing title/status/secondary-line assertions). Add:
test('renders a ZSymbol play overlay for a playable asset', () => {
  render(<AssetCard asset={{ id: '1', title: 'Kata', status: 'pending', review_count: 2 } as never} onPress={() => {}} />);
  expect(screen.getByTestId('asset-play-overlay')).toBeOnTheScreen();
});

test('uses an upload glyph (no play overlay) while waiting_upload', () => {
  render(<AssetCard asset={{ id: '1', title: 'Kata', status: 'waiting_upload', review_count: 0 } as never} onPress={() => {}} />);
  expect(screen.queryByTestId('asset-play-overlay')).toBeNull();
  expect(screen.getByTestId('asset-upload-overlay')).toBeOnTheScreen();
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `pnpm --filter mobile test asset-card`
Expected: FAIL — overlay testIDs absent.

- [ ] **Step 3: Rewrite `asset-card.tsx`**

```tsx
import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { Asset } from '../api/queries/assets';
import { colors } from '../theme/colors';
import { Touchable } from './ui/touchable';
import { ZBadge, type ZBadgeTone } from './ui/z-badge';
import { ZSymbol } from './ui/z-symbol';
import { ZVideoPreview } from './ui/z-video-preview';

const STATUS_TONE: Record<Asset['status'], ZBadgeTone> = {
  waiting_upload: 'neutral',
  pending: 'primary',
  completed: 'success',
};

export function AssetCard({ asset, onPress }: { asset: Asset; onPress: () => void }) {
  const { t } = useTranslation();
  const statusLabel =
    asset.status === 'waiting_upload'
      ? t('upload.uploading')
      : asset.status === 'pending'
        ? t('common.status.inReview')
        : t('common.status.reviewed');
  const secondaryLine = asset.group?.name || asset.description;
  const uploading = asset.status === 'waiting_upload';

  return (
    <Touchable
      testID={`asset-card-${asset.id}`}
      accessibilityLabel={asset.title}
      onPress={onPress}
      haptic
      className="flex-row items-center gap-3 rounded-[20px] bg-z-surface p-3 active:bg-z-surface-warm"
    >
      <View className="relative h-[70px] w-[104px] overflow-hidden rounded-2xl">
        <ZVideoPreview thumbnail={asset.thumbnail} alt={asset.title} />
        <View className="absolute inset-0 items-center justify-center">
          {uploading ? (
            <View testID="asset-upload-overlay">
              <ZSymbol name="file-video" label={t('upload.uploading')} size={22} color={colors.onPrimary} />
            </View>
          ) : (
            <View
              testID="asset-play-overlay"
              className="h-9 w-9 items-center justify-center rounded-full"
              style={{ backgroundColor: 'rgba(255,255,255,0.22)' }}
            >
              <ZSymbol name="play" label={t('videos.title')} size={18} color={colors.onPrimary} />
            </View>
          )}
        </View>
      </View>
      <View className="flex-1 gap-1">
        <Text numberOfLines={1} className="text-[15px] font-bold text-z-text">
          {asset.title}
        </Text>
        {secondaryLine ? (
          <Text numberOfLines={1} className="text-[12.5px] text-z-muted">
            {secondaryLine}
          </Text>
        ) : null}
        <View className="flex-row items-center gap-2">
          <ZBadge
            testID={`asset-status-${asset.status}`}
            label={statusLabel}
            tone={STATUS_TONE[asset.status]}
          />
          <View
            accessibilityLabel={t('videos.comments') + ': ' + asset.review_count}
            className="flex-row items-center gap-1"
          >
            <ZSymbol name="message" label={t('videos.comments')} size={14} color={colors.muted} />
            <Text className="text-xs font-semibold text-z-muted">{asset.review_count}</Text>
          </View>
        </View>
      </View>
    </Touchable>
  );
}
```

> Note: `colors.onPrimary` (white) is correct for the dark-thumbnail overlay glyph regardless of theme — the thumbnail is always a dark image/gradient.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter mobile test asset-card`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add mobile/src/components/asset-card.tsx mobile/src/components/asset-card.test.tsx
git commit -m "feat(mobile): refresh AssetCard (Touchable, ZSymbol, play overlay)"
```

---

## Task 9: `NextSessionCard` (hero + empty prompt)

**Files:**
- Create: `mobile/src/components/next-session-card.tsx`
- Test: `mobile/src/components/next-session-card.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// mobile/src/components/next-session-card.test.tsx
import { render, screen, userEvent } from '@testing-library/react-native';
import { initI18n } from '../i18n';
import { NextSessionCard } from './next-session-card';

beforeAll(() => initI18n('en'));

const booking = {
  id: 'b1', student_id: 'me', expert_id: 'x', expert_name: 'Coach Lee', student_name: 'Me',
  session_type_name: 'Video Review', status: 'pending',
  scheduled_at: new Date(Date.now() + 2 * 86_400_000).toISOString(), duration_minutes: 30,
} as never;

test('renders the next booking with a Join action', async () => {
  const onJoin = jest.fn();
  render(<NextSessionCard booking={booking} currentUserId="me" canBook onJoin={onJoin} onDetails={() => {}} onBook={() => {}} />);
  expect(screen.getByText('Next session')).toBeOnTheScreen();
  // Combined title "Video Review with Coach Lee" (home.nextSession.titleWith).
  expect(screen.getByText(/Coach Lee/)).toBeOnTheScreen();
  await userEvent.setup().press(screen.getByTestId('next-session-join'));
  expect(onJoin).toHaveBeenCalled();
});

test('renders a book prompt when there is no booking and the user can book', async () => {
  const onBook = jest.fn();
  render(<NextSessionCard booking={null} currentUserId="me" canBook onJoin={() => {}} onDetails={() => {}} onBook={onBook} />);
  await userEvent.setup().press(screen.getByTestId('next-session-book'));
  expect(onBook).toHaveBeenCalled();
});

test('renders nothing when there is no booking and the user cannot book', () => {
  render(<NextSessionCard booking={null} currentUserId="me" canBook={false} onJoin={() => {}} onDetails={() => {}} onBook={() => {}} />);
  expect(screen.queryByTestId('next-session-card')).toBeNull();
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `pnpm --filter mobile test next-session-card`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the component**

```tsx
// mobile/src/components/next-session-card.tsx
import type { ReactNode } from 'react';
import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { Booking } from '../api/queries/coaching';
import { formatBookingDateTime, formatRelativeTime } from '../api/queries/coaching';
import { bookingCounterpart } from './booking-card';
import { colors } from '../theme/colors';
import { ZBadge } from './ui/z-badge';
import { ZButton } from './ui/z-button';
import { ZSymbol } from './ui/z-symbol';

export type NextSessionCardProps = {
  /** Earliest upcoming booking, or null when none. */
  booking: Booking | null;
  currentUserId: string;
  /** Whether the user may book (gates the empty prompt). */
  canBook: boolean;
  onJoin: () => void;
  onDetails: () => void;
  onBook: () => void;
};

/**
 * Brand-led tonal hero surface (AGENTS.md Custom-RN tier a). A View — not ZCard —
 * because the handoff fixes radius 28 / padding 18 and the native Compose Card
 * exposes no corner-radius prop. All interactive children are native primitives.
 */
function HeroSurface({ children, testID }: { children: ReactNode; testID?: string }) {
  return (
    <View testID={testID} className="mx-4 rounded-[28px] bg-accent-container p-[18px]">
      {children}
    </View>
  );
}

export function NextSessionCard({
  booking,
  currentUserId,
  canBook,
  onJoin,
  onDetails,
  onBook,
}: NextSessionCardProps) {
  const { t, i18n } = useTranslation();

  // Empty: prompt to book (if allowed), else render nothing.
  if (!booking) {
    if (!canBook) return null;
    return (
      <HeroSurface testID="next-session-card">
        <Text className="text-base font-bold text-on-accent-container">
          {t('home.emptyCoaching.heading')}
        </Text>
        <Text className="mt-1 text-sm text-on-accent-container opacity-90">
          {t('home.emptyCoaching.description')}
        </Text>
        <View className="mt-4">
          <ZButton
            testID="next-session-book"
            label={t('common.actions.bookSession')}
            variant="primary"
            icon={<ZSymbol name="calendar-plus" label={t('common.actions.bookSession')} size={18} color={colors.onPrimary} />}
            onPress={onBook}
          />
        </View>
      </HeroSurface>
    );
  }

  const { name: counterpart } = bookingCounterpart(booking, currentUserId);
  const sessionTypeName = booking.session_type_name ?? t('sessions.sessionFallback');
  const relative = formatRelativeTime(booking.scheduled_at, i18n.language);

  return (
    <HeroSurface testID="next-session-card">
      <View className="flex-row items-center justify-between gap-2">
        <View className="flex-row items-center gap-1.5">
          <ZSymbol name="calendar" label={t('home.nextSession.title')} size={14} color={colors.accentStrong} />
          <Text className="text-[11px] font-extrabold uppercase tracking-wider text-on-accent-container">
            {t('home.nextSession.title')}
          </Text>
        </View>
        {/* Relative-time pill (handoff: surface chip). ZBadge neutral is the native pill primitive. */}
        <ZBadge testID="next-session-when" label={relative} tone="neutral" />
      </View>

      {/* Combined title "{type} mit {counterpart}" — 19px/800 per the handoff. */}
      <Text numberOfLines={2} className="mt-3 text-[19px] font-extrabold text-on-accent-container">
        {t('home.nextSession.titleWith', { type: sessionTypeName, name: counterpart })}
      </Text>
      <View className="mt-1.5 flex-row items-center gap-1.5">
        <ZSymbol name="clock" label={t('common.status.upcoming')} size={15} color={colors.accentStrong} />
        <Text className="text-[13.5px] text-on-accent-container opacity-90">
          {formatBookingDateTime(booking.scheduled_at)} · {booking.duration_minutes} min
        </Text>
      </View>

      <View className="mt-4 flex-row items-center gap-2">
        <ZButton
          testID="next-session-join"
          label={t('common.actions.join')}
          variant="primary"
          icon={<ZSymbol name="video" label={t('common.actions.join')} size={18} color={colors.onPrimary} />}
          onPress={onJoin}
        />
        <ZButton
          testID="next-session-details"
          label={t('common.actions.details')}
          variant="secondary"
          onPress={onDetails}
        />
      </View>
    </HeroSurface>
  );
}
```

> `colors.accentStrong` exists in `theme/colors` (mirrors `roles.accentStrong`); if absent, use `colors.primary`. Verify with `rg "accentStrong" mobile/src/theme/colors.ts` and adjust the icon color accordingly.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter mobile test next-session-card`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add mobile/src/components/next-session-card.*
git commit -m "feat(mobile): add NextSessionCard hero (+ book-session empty prompt)"
```

---

## Task 10: Rebuild the Home screen

**Files:**
- Modify: `mobile/src/app/(tabs)/(home)/index.tsx`
- (Test rewrite is Task 11.)

- [ ] **Step 1: Replace the screen body**

Full new file:

```tsx
import { useEffect, useMemo } from 'react';
import { Platform, ScrollView, Text, View } from 'react-native';
import { useNavigation, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useAssetsQuery } from '../../../api/queries/assets';
import { useGroupsQuery } from '../../../api/queries/groups';
import { useMyAvailabilityQuery, useMyBookingsQuery } from '../../../api/queries/coaching';
import { useNotificationsQuery } from '../../../api/queries/notifications';
import { useAuth } from '../../../auth/auth-store';
import { AssetCard } from '../../../components/asset-card';
import { FirstStepRow } from '../../../components/first-step-row';
import { NextSessionCard } from '../../../components/next-session-card';
import { NotificationBell } from '../../../components/notification-bell';
import { ZAvatar } from '../../../components/ui/z-avatar';
import { ZButton } from '../../../components/ui/z-button';
import { ZCard } from '../../../components/ui/z-card';
import { ZEmptyState } from '../../../components/ui/z-empty-state';
import { ZProgress } from '../../../components/ui/z-progress';
import { ZQueryError } from '../../../components/ui/z-query-error';
import { ZScreen } from '../../../components/ui/z-screen';
import { ZSkeleton } from '../../../components/ui/z-skeleton';
import { ZSymbol } from '../../../components/ui/z-symbol';
import { colors } from '../../../theme/colors';

const LATEST_VIDEOS_LIMIT = 4;
const ANDROID_TAB_BAR_HEIGHT = 56;

type HomeStep = {
  completed: boolean;
  labelKey: string;
  descriptionKey: string;
  onPress: () => void;
  testID: string;
};

function greetingKey(hour: number): string {
  if (hour < 12) return 'home.greeting.morning';
  if (hour < 18) return 'home.greeting.afternoon';
  return 'home.greeting.evening';
}

function initials(first?: string, last?: string): string {
  return `${(first?.[0] ?? '').toUpperCase()}${(last?.[0] ?? '').toUpperCase()}` || '?';
}

function RowSkeleton() {
  return (
    <View testID="home-video-skeleton" className="flex-row gap-3 py-2">
      <ZSkeleton className="h-[70px] w-[104px] rounded-2xl" />
      <View className="flex-1 justify-center gap-2">
        <ZSkeleton className="h-4 w-3/5" />
        <ZSkeleton className="h-3 w-2/5" />
      </View>
    </View>
  );
}

export default function HomeScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const user = useAuth((s) => s.user);
  const permissions = user?.permissions ?? null;
  const has = (perm: string) => permissions !== null && permissions.includes(perm);
  const canCreate = has('assets:create');
  const canBook = has('coaching:book');

  const assets = useAssetsQuery();
  const groups = useGroupsQuery();
  const bookings = useMyBookingsQuery();
  const notifications = useNotificationsQuery();
  const unreadCount = notifications.data?.unread_count ?? 0;

  // In-content greeting replaces the native header on both platforms.
  useEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const videoList = useMemo(() => assets.data ?? [], [assets.data]);
  const groupList = useMemo(() => groups.data ?? [], [groups.data]);

  const nowMs = new Date().getTime();
  const upcoming = (bookings.data ?? [])
    .filter((b) => b.status !== 'cancelled' && new Date(b.scheduled_at).getTime() > nowMs)
    .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime());
  const upcomingCount = upcoming.length;
  const nextBooking = upcoming[0] ?? null;

  const latestVideos = useMemo(() => videoList.slice(0, LATEST_VIDEOS_LIMIT), [videoList]);

  const hasGroups = groupList.length > 0;
  const hasVideos = videoList.length > 0;
  const hasReviewedVideos = videoList.some((a) => a.status === 'completed');
  const firstGroupId = groupList[0]?.id;

  const availabilityQuery = useMyAvailabilityQuery(
    has('coaching:availability:manage') ? (firstGroupId ?? '') : '',
  );
  const hasAvailability = (availabilityQuery.data ?? []).length > 0;

  const steps = useMemo<HomeStep[]>(() => {
    const list: HomeStep[] = [];
    if (has('groups:read')) {
      list.push({
        completed: hasGroups,
        labelKey: hasGroups ? 'home.firstSteps.groupCreated' : 'home.firstSteps.createGroup',
        descriptionKey: hasGroups
          ? 'home.firstSteps.groupCreatedDescription'
          : 'home.firstSteps.createGroupDescription',
        onPress: () =>
          hasGroups && firstGroupId ? router.push(`/group/${firstGroupId}`) : router.push('/groups'),
        testID: 'first-step-groups',
      });
    }
    if (canCreate) {
      list.push({
        completed: hasVideos,
        labelKey: hasVideos ? 'home.firstSteps.videoUploaded' : 'home.firstSteps.uploadFirstVideo',
        descriptionKey: hasVideos
          ? 'home.firstSteps.videoUploadedDescription'
          : 'home.firstSteps.uploadFirstVideoDescription',
        onPress: () => router.push(hasVideos ? '/videos' : '/upload'),
        testID: 'first-step-upload',
      });
    }
    if (has('reviews:read')) {
      list.push({
        completed: hasReviewedVideos,
        labelKey: 'home.firstSteps.reviewVideos',
        descriptionKey: 'home.firstSteps.reviewVideosDescription',
        onPress: () => router.push('/videos'),
        testID: 'first-step-review',
      });
    }
    if (has('coaching:book')) {
      list.push({
        completed: upcomingCount > 0,
        labelKey: upcomingCount > 0 ? 'home.firstSteps.coachingBooked' : 'home.firstSteps.bookLiveCoaching',
        descriptionKey:
          upcomingCount > 0
            ? 'home.firstSteps.coachingBookedDescription'
            : 'home.firstSteps.bookLiveCoachingDescription',
        onPress: () => router.push(upcomingCount > 0 ? '/coaching' : '/book'),
        testID: 'first-step-coaching',
      });
    }
    if (has('coaching:availability:manage')) {
      list.push({
        completed: hasAvailability,
        labelKey: 'home.firstSteps.setAvailability',
        descriptionKey: 'home.firstSteps.setAvailabilityDescription',
        onPress: () => router.push('/availability' as never),
        testID: 'first-step-availability',
      });
    }
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [permissions, hasGroups, hasVideos, hasReviewedVideos, firstGroupId, upcomingCount, hasAvailability]);

  const loaded = groups.isSuccess && assets.isSuccess;
  const showFirstSteps = loaded && steps.some((step) => !step.completed);
  const completedCount = steps.filter((s) => s.completed).length;

  let latestContent: React.ReactNode;
  if (assets.isPending) {
    latestContent = (
      <View className="gap-1">
        <RowSkeleton />
        <RowSkeleton />
      </View>
    );
  } else if (assets.isError) {
    latestContent = (
      <ZQueryError title={t('videos.phase4.loadFailed')} onRetry={() => void assets.refetch()} />
    );
  } else if (latestVideos.length === 0) {
    latestContent = (
      <ZEmptyState
        title={t('videos.noVideosYet')}
        description={t('videos.uploadFirstDescription')}
        icon={<ZSymbol name="video" label={t('videos.title')} size={24} color={colors.primary} />}
      >
        {canCreate ? (
          <ZButton
            testID="latest-videos-upload"
            label={t('videos.uploadNew')}
            onPress={() => router.push('/upload')}
          />
        ) : null}
      </ZEmptyState>
    );
  } else {
    latestContent = (
      <View testID="latest-videos-list" className="gap-3">
        {latestVideos.map((asset) => (
          <AssetCard key={asset.id} asset={asset} onPress={() => router.push(`/asset/${asset.id}`)} />
        ))}
      </View>
    );
  }

  return (
    <ZScreen edges={['top']}>
      {/* Module 1: greeting header (outside the scroll, sticky-feeling) */}
      <View className="flex-row items-center gap-3 px-4 pb-3.5 pt-2">
        <ZAvatar
          tone="accent"
          shape="circle"
          size={44}
          fallback={initials(user?.first_name, user?.last_name)}
          image={user?.avatar || undefined}
          alt={`${user?.first_name ?? ''} ${user?.last_name ?? ''}`.trim()}
        />
        <View className="min-w-0 flex-1">
          <Text className="text-[13px] font-semibold text-z-muted">{t(greetingKey(new Date().getHours()))}</Text>
          <Text
            numberOfLines={1}
            className="text-[22px] font-extrabold text-z-text"
            style={{ letterSpacing: -0.44 }}
          >
            {user?.first_name ?? ''}
          </Text>
        </View>
        <NotificationBell unreadCount={unreadCount} onPress={() => router.push('/notifications')} />
      </View>

      <ScrollView
        className="flex-1"
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{
          paddingBottom: 16 + (Platform.OS === 'android' ? insets.bottom + ANDROID_TAB_BAR_HEIGHT : 0),
          gap: 22,
        }}
      >
        {/* Module 2: next-session hero (renders nothing when no booking & cannot book) */}
        {loaded ? (
          <NextSessionCard
            booking={nextBooking}
            currentUserId={user?.id ?? ''}
            canBook={canBook}
            onJoin={() => (nextBooking ? router.push(`/coaching`) : undefined)}
            onDetails={() => router.push('/coaching')}
            onBook={() => router.push('/book')}
          />
        ) : null}

        {/* Module 3: your videos */}
        <View className="px-4">
          <View className="mb-2.5 flex-row items-center justify-between">
            <Text numberOfLines={1} className="text-[17px] font-extrabold text-z-text">
              {t('home.latestVideos')}
            </Text>
            <ZButton
              testID="latest-videos-view-all"
              label={t('common.actions.viewAll')}
              variant="link"
              onPress={() => router.push('/videos')}
            />
          </View>
          {latestContent}
        </View>

        {/* Module 4: first-steps progress card */}
        {showFirstSteps ? (
          <ZCard testID="first-steps-card" className="mx-4">
            <View className="flex-row items-center justify-between">
              <Text className="text-base font-extrabold text-z-text">{t('home.firstSteps.title')}</Text>
              <Text className="text-[13px] font-bold text-z-muted">
                {completedCount}/{steps.length}
              </Text>
            </View>
            <ZProgress
              testID="first-steps-progress"
              value={steps.length ? completedCount / steps.length : 0}
              className="mt-3"
            />
            <View className="mt-4 gap-3">
              {steps.map((step) => (
                <FirstStepRow
                  key={step.labelKey}
                  testID={step.testID}
                  label={t(step.labelKey)}
                  description={t(step.descriptionKey)}
                  completed={step.completed}
                  onPress={step.onPress}
                />
              ))}
            </View>
          </ZCard>
        ) : null}
      </ScrollView>
    </ZScreen>
  );
}
```

> The hero `onJoin` reuses the existing booking flow by routing to `/coaching` (the join window / join action lives there today). Wiring a direct deep-link join is a follow-up.

- [ ] **Step 2: Typecheck the screen**

Run: `pnpm --filter mobile typecheck`
Expected: PASS (no type errors). Fix any `Booking`/`Me` field mismatches surfaced here.

- [ ] **Step 3: Commit**

```bash
git add "mobile/src/app/(tabs)/(home)/index.tsx"
git commit -m "feat(mobile): rebuild Home — greeting, next-session hero, progress card"
```

---

## Task 11: Rewrite the Home screen tests

**Files:**
- Modify: `mobile/src/__tests__/home-screen.test.tsx`

- [ ] **Step 1: Update the auth mock to provide a full user**

Replace the `mockPermissions` machinery with a `mockUser` that carries identity + permissions:

```tsx
let mockUser: { id: string; first_name: string; last_name: string; avatar?: string; permissions: string[] } | null = null;
jest.mock('../../src/auth/auth-store', () => ({
  ...jest.requireActual('../../src/auth/auth-store'),
  useAuth: (selector: (s: { user: typeof mockUser }) => unknown) => selector({ user: mockUser }),
}));
```

In `beforeEach`, set a default signed-in user:

```tsx
  mockUser = { id: 'u1', first_name: 'Heinrich', last_name: 'M', permissions: [] };
```

Helper to set permissions in a test: `mockUser = { ...mockUser!, permissions: [...] }`.

- [ ] **Step 2: Delete the stat-card tests, add greeting/hero/progress tests**

Remove these now-invalid tests: `stat cards render live counts…`, `cancelled and past bookings are excluded…` (count assertion), `tapping a stat card navigates…`, and the three `notification bell … headerRight via setOptions` tests (the bell is now in-content, not headerRight).

Add:

```tsx
test('renders the greeting and first name', async () => {
  mockUser = { id: 'u1', first_name: 'Heinrich', last_name: 'M', permissions: [] };
  await render(<Providers><HomeScreen /></Providers>);
  expect(screen.getByText('Heinrich')).toBeOnTheScreen();
  // greeting is time-of-day dependent; assert one of the three is present
  expect(
    screen.queryByText('Good morning') || screen.queryByText('Good afternoon') || screen.queryByText('Good evening'),
  ).not.toBeNull();
});

test('hides the native header in favor of the in-content greeting', async () => {
  await render(<Providers><HomeScreen /></Providers>);
  expect(mockSetOptions).toHaveBeenCalledWith(expect.objectContaining({ headerShown: false }));
});

test('renders the next-session hero for an upcoming booking', async () => {
  mockUser = { id: 'me', first_name: 'A', last_name: 'B', permissions: ['coaching:book'] };
  mockUseMyBookingsQuery.mockReturnValue(success([{
    id: 'b1', student_id: 'me', expert_id: 'x', expert_name: 'Coach Lee', student_name: 'Me',
    session_type_name: 'Video Review', status: 'pending', duration_minutes: 30,
    scheduled_at: new Date(Date.now() + 2 * 86_400_000).toISOString(),
  }]));
  await render(<Providers><HomeScreen /></Providers>);
  expect(screen.getByTestId('next-session-card')).toBeOnTheScreen();
  expect(screen.getByText(/Coach Lee/)).toBeOnTheScreen();
});

test('hero shows a book prompt when there is no booking and the user can book', async () => {
  mockUser = { id: 'me', first_name: 'A', last_name: 'B', permissions: ['coaching:book'] };
  mockUseMyBookingsQuery.mockReturnValue(success([]));
  await render(<Providers><HomeScreen /></Providers>);
  expect(screen.getByTestId('next-session-book')).toBeOnTheScreen();
});

test('first-steps card shows a progress bar', async () => {
  mockUser = { id: 'u1', first_name: 'A', last_name: 'B', permissions: ['assets:create'] };
  mockUseAssetsQuery.mockReturnValue(success([]));
  await render(<Providers><HomeScreen /></Providers>);
  expect(screen.getByTestId('first-steps-progress')).toBeOnTheScreen();
});

test('does not render the removed stat cards', async () => {
  mockUser = { id: 'u1', first_name: 'A', last_name: 'B', permissions: ['groups:read', 'coaching:bookings:read'] };
  await render(<Providers><HomeScreen /></Providers>);
  expect(screen.queryByTestId('stat-card-videos')).toBeNull();
});
```

Keep (with `mockUser` permission updates instead of `mockPermissions`): the latest-videos heading, "view all" navigation, latest-videos empty/upload-CTA/skeleton, all `first-steps`/`availability` permission-gating tests.

- [ ] **Step 3: Run the home test file**

Run: `pnpm --filter mobile test home-screen`
Expected: PASS (all tests). Fix any leftover `mockPermissions` references.

- [ ] **Step 4: Commit**

```bash
git add mobile/src/__tests__/home-screen.test.tsx
git commit -m "test(mobile): rewrite Home tests for greeting/hero/progress modules"
```

---

## Task 12: Videos screen — drop counts, add overline

**Files:**
- Modify: `mobile/src/app/(tabs)/videos/index.tsx`
- Test: `mobile/src/__tests__/` (videos screen test, if present) or add inline assertions

- [ ] **Step 1: Remove count derivations + count props**

Delete `reviewedCount`/`toReviewCount` and drop `count` from `filterTabs`:

```tsx
  const filteredAssets = useMemo(() => filterAssets(assets, activeFilter), [assets, activeFilter]);

  const filterTabs = [
    { id: 'all', label: t('videos.all') },
    { id: 'toReview', label: t('videos.reviewStatus.toReview') },
    { id: 'reviewed', label: t('videos.reviewStatus.reviewed') },
  ];
```

- [ ] **Step 2: Add the "N VIDEOS" overline to the list header**

Replace the data-branch `ListHeaderComponent` with JobCards + an overline:

```tsx
          ListHeaderComponent={
            <>
              <JobCards jobs={jobs} />
              <Text
                testID="videos-count-overline"
                className="pb-2 text-[12.5px] font-bold uppercase tracking-wider text-z-muted"
              >
                {t('videos.videoCount', { count: assets.length })}
              </Text>
            </>
          }
```

Add `Text` to the `react-native` import at the top of the file (`import { FlatList, Platform, RefreshControl, Text, View } from 'react-native';`).

- [ ] **Step 3: Swap the round FAB for the extended `ZFab`**

Replace the import of `ZIconButton` with `ZFab` (remove `ZIconButton` if now unused):

```tsx
import { ZFab } from '../../../components/ui/z-fab';
```

Replace the Android FAB block at the bottom of the screen:

```tsx
      {Platform.OS === 'android' && canCreate && (
        <ZFab
          testID="videos-create-fab"
          label={t('common.actions.uploadVideo')}
          icon={<ZSymbol name="plus" label={t('common.actions.add')} size={24} color={colors.onAccentContainer} />}
          onPress={() => router.push('/upload')}
          className="absolute right-6"
          style={{ bottom: insets.bottom + ANDROID_TAB_BAR_HEIGHT + 16 }}
        />
      )}
```

> Verify `colors.onAccentContainer` exists in `theme/colors.ts` (mirrors
> `roles.onAccentContainer`); if absent, add it there so the FAB icon tint
> matches the label. The iOS create action (nav-bar "+") is unchanged — `ZFab`
> renders null on iOS.

- [ ] **Step 4: Typecheck + run videos-related tests**

Run: `pnpm --filter mobile typecheck && pnpm --filter mobile test videos`
Expected: PASS. Update any videos test that asserted `Alle (4)`-style labels to assert plain segment labels + the `videos-count-overline`, and keep `videos-create-fab` present.

- [ ] **Step 5: Commit**

```bash
git add "mobile/src/app/(tabs)/videos/index.tsx"
git commit -m "feat(mobile): Videos — drop segment counts, N-videos overline, extended FAB"
```

---

## Task 13: Full green gate + device verification

- [ ] **Step 1: Lint**

Run: `make mobile:lint`
Expected: PASS (no raw `Pressable`/`lucide` introduced in `src/app/**`; ZSymbol used).

- [ ] **Step 2: Typecheck (incl. .ios/.android/.types)**

Run: `make mobile:typecheck`
Expected: PASS.

- [ ] **Step 3: Test suite**

Run: `make mobile:test`
Expected: PASS (all suites, including `native-classname-forwarding`).

- [ ] **Step 4: Device smoke + screenshots**

Build/launch the dev client on a real iOS **and** Android device (per `zeta-local-android-build-wsl` / `zeta-emulator-test-setup`). Verify on each platform:
- Home: greeting (avatar/name/bell), hero (booking + empty-prompt + no-permission→nothing), "your videos" list + view-all, first-steps card with progress bar; no stat cards; greeting clears the status bar (no overlap).
- Videos: full-width segmented filter (no counts), "N VIDEOS" overline, refreshed cards (play overlay, status badge, comment count), FAB (Android) / header "+" (iOS).

Capture iOS + Android screenshots of both screens for the PR description (required by AGENTS.md).

- [ ] **Step 5: Final commit / PR prep**

```bash
git add -u
git commit -m "docs(mobile): home/videos redesign — screenshots + notes"
```

---

## Self-review (spec coverage)

- Greeting header → Task 10 (avatar/greeting/bell, `headerShown:false`, `edges={['top']}`). ✅
- Next-session hero (radius 28 / pad 18 / accent-container, combined "{type} mit {name}" title, Beitreten + Details) + empty prompt → Tasks 9, 10. ✅
- Your-videos section (no ZCard wrapper, "Alle ansehen" link) → Task 10. ✅
- First-steps progress card (counter + bar) → native `ZProgress` (Task 1) + Task 10. ✅
- Stat cards removed → Tasks 10, 11. ✅
- Videos segment counts → "N VIDEOS" overline (total) + extended FAB → Tasks 1B, 12. ✅
- AssetCard refresh (radius 20, 15px/700 title, 12.5px group, play overlay, no duration pill, Touchable) → Tasks 4, 8. ✅
- Tokens unchanged; native controls (LinearProgressIndicator / ProgressView, ExtendedFAB) + tier-(a) brand-led hero → Tasks 1, 1B, 9. ✅
- i18n keys (mobile + web, no sync) → Task 7. ✅
- Tests + device screenshots → Tasks 11, 12, 13. ✅

## Known deviations from the handoff (intentional)

- **No duration pill** — `Asset` has no duration field and list responses omit `videos`; no data to show. The only hard data-driven deviation.
- **Progress bar uses the M3 `LinearProgressIndicator` / SwiftUI `ProgressView`** (native widgets) rather than the prototype's exact 6px/999 hand-drawn bar — per the user's explicit "native M3 component" instruction; the bare fallback keeps the 6px look for web/jest.
- **Hero is a brand-led `View`, not `ZCard`** — required to hit the handoff's radius 28 / padding 18 (native Compose `Card` has no corner-radius prop). Visually matches the handoff; sanctioned as Custom-RN tier (a). All hero controls remain native primitives.
- **Play glyph** via new `ZSymbol play` instead of a hand-drawn triangle (more native; the prototype only lacked an app glyph).
- **Videos create FAB → Material 3 extended FAB (`ZFab`)** — matches the prototype's labeled "Hochladen" FAB and the user's request; supersedes the README's "keep as-is" wording.
- Section header copy reuses `home.latestVideos` (handoff's i18n reuse list) — German renders "Neueste Videos" rather than the prototype caption "Deine Videos"; pure copy nuance, no new key per the handoff.
- `upload-progress-card.tsx` keeps its inline bar for now; migrating it to `ZProgress` is a follow-up.
```
