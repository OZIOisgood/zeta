# Mobile Shared UI Foundation (WP-UI0) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to execute this plan. Dispatch one subagent per Task, in order. Each Task is self-contained; do not batch Tasks. Steps use checkbox (`- [ ]`) syntax — tick each as you complete it. Write the FAILING test first with REAL code, run it, see it fail for the stated reason, then write the minimal REAL implementation, run it green, then commit. NO placeholders, NO "similar to Task X". Do NOT run lint/git while authoring; those commands live inside the Tasks.

**Goal:** Build the four shared UI pieces every other mobile parity work-package (WP3 notifications, WP4 review write lifecycle, WP5 group admin, WP6 expert availability, WP7 reports, WP8 compliance/account) composes from, so those plans stop hand-rolling back-headers, icon tiles, danger cards, and per-screen date formatters. This package introduces:

1. **`ZBackHeader`** — the pushed/detail/sub-screen header (back button + title + optional subtitle + optional trailing action). Complements (does not replace) `ZPageHeader`, which stays reserved for the 5 tab index screens.
2. **`ZIconTile`** — the rounded tone-mapped glyph tile used in list rows, danger cards, and section headers (the recurring `h-10 w-10 rounded-md bg-<tone>` block currently re-inlined per screen).
3. **`ZDangerZoneCard`** — the single destructive-action card (icon tile + title/description + danger button wired to a confirm dialog), shared by group-delete (WP5) and account-delete (WP8).
4. **`mobile/src/lib/datetime.ts`** — the one relative/absolute time helper, consolidating the English-only `formatRelativeTime` currently living in `review-item.tsx`, the notifications relative-time, and the inline reports/availability date formatting. `review-item.tsx` is refactored to import from it (no behaviour change for existing callers).

**Architecture:** Shape **M** (mobile-only, no backend or contract change). Every piece is a presentational primitive composed from existing `z-*` primitives (`ZIconButton`, `ZCard`, `ZButton`, `ZConfirmDialog`) and existing design tokens (`mobile/src/theme/colors.ts` + NativeWind `z-*` classes). The datetime helper is a pure i18n-aware function module with no React. No new dependency is added.

**Tech Stack:** Expo/React Native (NativeWind, lucide-react-native, i18next/react-i18next), jest-expo + React Native Testing Library (`render()` is async; tests that render translated copy wrap with `initI18n('en')`). No `@tanstack/react-query`, no `openapi-fetch`, no Go in this WP.

---

## Why this lands FIRST (dependency note)

**WP3, WP4, WP5, WP6, WP7, and WP8 all depend on this plan landing first.** Their plans reference these four pieces by exact name and props as the single source of truth:

- **WP3 (notifications)** — its relative-time row timestamp comes from `datetime.formatRelativeTime`; the notifications **screen** (a pushed route `/notifications`) uses `ZBackHeader`, and notification rows use `ZIconTile` for the per-type glyph.
- **WP4 (review write lifecycle)** — review rows render their timestamp via `datetime.formatRelativeTime` (the same helper `review-item.tsx` is migrated onto here).
- **WP5 (group admin)** — group-delete uses `ZDangerZoneCard`; the group-preferences sub-screen uses `ZBackHeader`; member rows use `ZIconTile`.
- **WP6 (expert availability)** — the availability sub-screen uses `ZBackHeader`; "N min" durations use `common.labels.minutesShort`; day/slot dates go through `datetime.formatDate`.
- **WP7 (reports)** — the reports sub-screen uses `ZBackHeader`; report rows use `ZIconTile` (tone by status) + `datetime.formatRelativeTime`; durations use `common.labels.minutesShort`.
- **WP8 (compliance/account)** — account-delete uses `ZDangerZoneCard`.

Each downstream plan should be executed only after the four files below exist on `feat/mobile-token-auth`. If a downstream Task imports `@/components/ui/z-back-header`, `@/components/ui/z-icon-tile`, `@/components/ui/z-danger-zone-card`, or `@/lib/datetime` and the module is missing, that WP started out of order — land WP-UI0 first.

---

## Shared-piece contracts (the single source of truth — downstream plans MUST match these exactly)

### 1. `ZBackHeader` — `mobile/src/components/ui/z-back-header.tsx`

```ts
{ title: string; subtitle?: string; onBack?: () => void; action?: ReactNode; testID?: string }
```

Renders a leading back `ZIconButton` (`ArrowLeft` glyph, `accessibilityLabel = t('common.actions.back')`) + the title (`text-lg font-semibold text-z-text`) + optional subtitle (`text-sm text-z-muted`) + an optional trailing `action` slot. `onBack` defaults to `router.back()` (expo-router). **Use for pushed / detail / sub-screens** (notifications screen, reports, availability, group-preferences). `ZPageHeader` stays reserved for the 5 tab index screens — do NOT use `ZPageHeader` on a pushed route, and do NOT use `ZBackHeader` on a tab index screen.

### 2. `ZIconTile` — `mobile/src/components/ui/z-icon-tile.tsx`

```ts
{ icon: ReactNode; tone?: 'neutral' | 'primary' | 'success' | 'warning' | 'danger'; size?: 'sm' | 'md'; testID?: string }
```

Renders the rounded tile (`size='md'` → `h-10 w-10 rounded-md`, default; `size='sm'` → `h-9 w-9 rounded-md`) with a `tone → z-token` background/foreground map, centering the passed glyph. Tones map ONLY to `z-*` tokens / NativeWind `z-*` classes — **never** raw Tailwind palette (no `bg-green-50`/`amber-50`/`rose-50`, no `text-white`). `neutral` = `bg-z-surface-warm` + `text-z-primary`; `primary`/`success`/`warning`/`danger` use the matching `z-*` soft surface + `z-*` foreground (table in Task U0-3). The caller passes a sized lucide glyph as `icon` (the tile does not size the glyph).

### 3. `ZDangerZoneCard` — `mobile/src/components/ui/z-danger-zone-card.tsx`

```ts
{
  title: string; description: string;
  actionLabel: string; onAction: () => void;
  loading?: boolean; disabled?: boolean;
  confirmTitle: string; confirmMessage: string; confirmLabel: string;
  testID?: string;
}
```

Composes `ZCard` + `ZIconTile(tone='danger', icon=<AlertTriangle …/>)` + title (`text-base font-semibold text-z-text`) + description (`text-sm text-z-muted`) + `ZButton(variant='danger')`. Pressing the button opens a `ZConfirmDialog(tone='danger')` (title=`confirmTitle`, description=`confirmMessage`, confirm=`confirmLabel`, cancel=`t('common.actions.cancel')`); confirming calls `onAction` and closes the dialog. While `loading`, the button shows its spinner and the dialog's confirm is disabled (`confirmDisabled`). `disabled` (or `loading`) disables the trigger button. **THE single destructive-action card** — group-delete (WP5) and account-delete (WP8) both consume it. No raw `rose-*`, no `opacity-danger` borders.

### 4. `mobile/src/lib/datetime.ts`

```ts
export function formatRelativeTime(iso: string, t: TFunction): string
export function formatDate(iso: string): string
```

- `formatRelativeTime(iso, t)` — localized "just now / Nm / Nh / Nd / <date>" buckets. Buckets mirror the existing `review-item` logic (`<60s` just-now, `<3600s` minutes, `<86400s` hours, `<604800s` days, else absolute date). Strings come from i18n (`common.time.*`, added in Task U0-7) so de/fr render correctly — replacing the hard-coded English `'just now'`/`'m ago'`. Invalid/empty ISO → `''` (same as today).
- `formatDate(iso)` — locale-aware absolute date via `Intl`/`toLocaleDateString()` for day/slot/absolute display in reports & availability. Invalid/empty ISO → `''`.

**ALL relative/absolute time display in mobile goes through this module** — no per-screen formatters. `review-item.tsx`'s private `formatRelativeTime` is deleted and the component imports `formatRelativeTime` from here (Task U0-9).

---

## Conventions inherited by every downstream WP (stated here, the foundation, so they stay uniform)

- **Form-save FAILURE → inline error banner** (review-write / group-admin / availability / compliance). **Fire-and-forget success** (enhance / finalize / delete-success / mark-all-read) → `showToast` (`mobile/src/components/ui/z-toast.tsx`).
- **Destructive actions → `ZConfirmDialog`** (never a hand-rolled inline two-step). `ZDangerZoneCard` is the canonical wrapper.
- **One minutes i18n key:** `common.labels.minutesShort` (`'{{count}} min'`, already present) for every "N min" across reports + availability.
- **Status pills = `ZBadge`/`ZChip`** — never a hand-built `rounded-full`+`bg-*` `View`.
- **Query-backed surfaces render four states** — pending (`ZSkeleton`) / `isError` + retry (`ZQueryError`) / empty (`ZEmptyState`) / data, with `isError` checked **before** the empty branch.

WP-UI0 itself ships only presentational primitives + a pure helper, so it has no query states of its own; these conventions are recorded here as the contract the dependents follow.

---

## FILE STRUCTURE

**Created:**

| File | Responsibility |
| --- | --- |
| `mobile/src/components/ui/z-back-header.tsx` | `ZBackHeader` — pushed/detail/sub-screen header: back `ZIconButton` (`ArrowLeft`) + title + optional subtitle + optional trailing `action`; default `onBack = router.back()`. |
| `mobile/src/components/ui/z-back-header.test.tsx` | RNTL tests: renders title; renders/omits subtitle; back button uses `t('common.actions.back')` and fires custom `onBack`; renders trailing action slot. |
| `mobile/src/components/ui/z-icon-tile.tsx` | `ZIconTile` — rounded tone-mapped glyph tile; `tone`→`z-*` token map; `size` md/sm; renders the passed glyph centered. |
| `mobile/src/components/ui/z-icon-tile.test.tsx` | RNTL tests: renders the passed glyph (testID); applies md vs sm sizing; default tone is neutral; accepts each tone without raw-palette leakage (snapshot of className). |
| `mobile/src/components/ui/z-danger-zone-card.tsx` | `ZDangerZoneCard` — `ZCard` + danger `ZIconTile` + copy + danger `ZButton` opening a danger `ZConfirmDialog`; `loading`/`disabled` wiring. |
| `mobile/src/components/ui/z-danger-zone-card.test.tsx` | RNTL tests: renders title/description/actionLabel; pressing action opens the confirm dialog; confirming calls `onAction` once + closes; cancel does not call `onAction`; `loading` shows spinner + disables confirm; `disabled` blocks the trigger. |
| `mobile/src/lib/datetime.ts` | `formatRelativeTime(iso, t)` + `formatDate(iso)` — the single relative/absolute time helper. |
| `mobile/src/lib/datetime.test.ts` | Unit tests for every relative bucket boundary (just-now / minutes / hours / days / absolute fallback), invalid-ISO → `''`, and `formatDate` valid + invalid. |

**Modified:**

| File | Responsibility |
| --- | --- |
| `mobile/src/components/review-item.tsx` | Delete the private `formatRelativeTime`; import `formatRelativeTime` from `../lib/datetime`; pass `t` through (the component already has `t` from `useTranslation`). `formatTimestamp` (the `m:ss` helper) is **unchanged** — it is not a date helper and stays in `review-item.tsx`. |
| `web/dashboard-next/public/i18n/{en,de,fr}.json` | Add the `common.time.*` block (just-now / minutes / hours / days) so `sync:i18n` carries it to mobile. |
| `mobile/src/i18n/locales/{en,de,fr}.json` | Refreshed by `pnpm --dir mobile run sync:i18n` (then re-add any mobile-only keys by hand — sync is destructive). |

No new `z-*` primitive duplicates an existing one: `ZBackHeader` is distinct from `ZPageHeader` (back affordance + smaller `text-lg` title for pushed routes vs `text-2xl` index title with no back); `ZIconTile` extracts the tile block that `ZConfirmDialog`/`ZToast` currently inline; `ZDangerZoneCard` composes `ZCard`+`ZIconTile`+`ZButton`+`ZConfirmDialog`. Each new primitive gets a Storybook-equivalent note in its file header (mobile has no Storybook; the file doc-comment names the web counterpart pattern, matching the existing primitives' headers).

---

## CONSTRAINTS (state in every commit / PR note)

- Single PR **#15**, branch **`feat/mobile-token-auth`**. Make **local commits per Task; do NOT push**.
- **Shared working tree:** WP-UI0 touches ONLY `mobile/src/components/ui/*`, `mobile/src/lib/datetime.ts`, `mobile/src/components/review-item.tsx`, and the i18n JSONs. It does **not** touch `mobile/src/app/`, so it is collision-free with screen-editing sessions and should run first/early.
- **No shared-DB migration** (no Go/SQL/contract change in this WP).
- **No raw hex / no raw Tailwind palette in the new primitives** — colors come from `mobile/src/theme/colors.ts` (icon `color` props) or NativeWind `z-*` classes (surfaces/text). The AGENTS guardrail (`bg-green-50`/`amber-50`/`rose-50`, `text-white`) is explicitly disallowed in `ZIconTile`/`ZDangerZoneCard`.
- **WSL tooling:** run every command via `wsl.exe -d ubuntu bash -lc "cd /home/heinrich/dev/projects/zeta && <cmd>"`. Single-file test runner: `pnpm --dir mobile jest <path>`. Tests live next to the component (`*.test.tsx`) or in `src/__tests__/` — never under `src/app/` (expo-router would route them).

---

## Task U0-1 — `ZBackHeader` failing test

**Files:** `mobile/src/components/ui/z-back-header.test.tsx` (create).

- [ ] Read `mobile/src/components/ui/z-page-header.test.tsx` and `mobile/src/components/ui/z-confirm-dialog.test.tsx` to match the RNTL style (async `render`, `screen.getByText`, `userEvent.setup()`, `getByRole('button', { name })`).
- [ ] Mock expo-router so the default `onBack` is observable. At the top of the test file:

```tsx
import { render, screen, userEvent } from '@testing-library/react-native';
import { Text } from 'react-native';
import { initI18n } from '../../i18n';

const back = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ back }) }));

import { ZBackHeader } from './z-back-header';

beforeAll(async () => {
  await initI18n('en');
});

beforeEach(() => {
  back.mockClear();
});

test('renders the title', async () => {
  await render(<ZBackHeader title="Reports" />);
  expect(screen.getByText('Reports')).toBeOnTheScreen();
});

test('renders the subtitle when provided', async () => {
  await render(<ZBackHeader title="Reports" subtitle="Flagged content review." />);
  expect(screen.getByText('Flagged content review.')).toBeOnTheScreen();
});

test('omits the subtitle when not provided', async () => {
  await render(<ZBackHeader title="Reports" testID="hdr" />);
  expect(screen.getByTestId('hdr')).toBeOnTheScreen();
  expect(screen.queryByText('Flagged content review.')).toBeNull();
});

test('back button is labelled with the localized back action', async () => {
  await render(<ZBackHeader title="Reports" />);
  expect(screen.getByRole('button', { name: 'Back' })).toBeOnTheScreen();
});

test('default onBack calls router.back()', async () => {
  const user = userEvent.setup();
  await render(<ZBackHeader title="Reports" />);
  await user.press(screen.getByRole('button', { name: 'Back' }));
  expect(back).toHaveBeenCalledTimes(1);
});

test('custom onBack overrides router.back()', async () => {
  const user = userEvent.setup();
  const onBack = jest.fn();
  await render(<ZBackHeader title="Reports" onBack={onBack} />);
  await user.press(screen.getByRole('button', { name: 'Back' }));
  expect(onBack).toHaveBeenCalledTimes(1);
  expect(back).not.toHaveBeenCalled();
});

test('renders the trailing action slot', async () => {
  await render(<ZBackHeader title="Reports" action={<Text>filter</Text>} />);
  expect(screen.getByText('filter')).toBeOnTheScreen();
});
```

- [ ] Run, expect **FAIL** (module not found): `wsl.exe -d ubuntu bash -lc "cd /home/heinrich/dev/projects/zeta && pnpm --dir mobile jest src/components/ui/z-back-header.test.tsx"` → `Cannot find module './z-back-header'`.

## Task U0-2 — `ZBackHeader` implementation

**Files:** `mobile/src/components/ui/z-back-header.tsx` (create).

- [ ] Write the real component. The back button reuses `ZIconButton` (so the accessible label + press handling match the rest of the app); the title uses `text-lg font-semibold text-z-text` (smaller than `ZPageHeader`'s `text-2xl`, signalling a pushed route).

```tsx
import type { ReactNode } from 'react';
import { Text, View } from 'react-native';
import { ArrowLeft } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { colors } from '../../theme/colors';
import { ZIconButton } from './z-icon-button';

/**
 * Header for pushed / detail / sub-screens: a leading back button + title +
 * optional one-line subtitle + optional trailing action slot. The mobile
 * counterpart of the web detail-page back affordance. NOTE: `ZPageHeader`
 * stays reserved for the 5 tab index screens — use `ZBackHeader` on any route
 * reached via `router.push` (reports, availability, notifications, group
 * preferences, account). Default `onBack` is `router.back()`.
 */
export function ZBackHeader({
  title,
  subtitle,
  onBack,
  action,
  testID,
}: {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  action?: ReactNode;
  testID?: string;
}) {
  const router = useRouter();
  const { t } = useTranslation();
  const handleBack = onBack ?? (() => router.back());

  return (
    <View testID={testID} className="flex-row items-center gap-2 px-2 py-2">
      <ZIconButton label={t('common.actions.back')} onPress={handleBack}>
        <ArrowLeft color={colors.text} size={20} />
      </ZIconButton>
      <View className="min-w-0 flex-1">
        <Text className="text-lg font-semibold text-z-text" numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text className="text-sm text-z-muted" numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {action ? <View className="shrink-0">{action}</View> : null}
    </View>
  );
}
```

- [ ] Run, expect **PASS**: `wsl.exe -d ubuntu bash -lc "cd /home/heinrich/dev/projects/zeta && pnpm --dir mobile jest src/components/ui/z-back-header.test.tsx"` → all green.
- [ ] Commit: `git add -u mobile/src/components/ui/z-back-header.tsx mobile/src/components/ui/z-back-header.test.tsx && git commit -m "feat(mobile): add ZBackHeader for pushed sub-screens"`.

## Task U0-3 — `ZIconTile` failing test

**Files:** `mobile/src/components/ui/z-icon-tile.test.tsx` (create).

The tone → token map this primitive implements (`z-*` only — no raw palette):

| tone | background class | foreground (icon color via `colors.*`) |
| --- | --- | --- |
| `neutral` | `bg-z-surface-warm` | `colors.primary` |
| `primary` | `bg-z-primary-soft` | `colors.primaryStrong` |
| `success` | `bg-z-success-soft` | `colors.success` |
| `warning` | `bg-z-warning-soft` | `colors.warning` |
| `danger` | `bg-z-danger-soft` | `colors.danger` |

> NOTE for the implementer: `ZIconTile` controls only the **background** (NativeWind class). The glyph color is the caller's responsibility (the caller passes a coloured lucide node), so the foreground column above is the convention callers SHOULD follow, surfaced in the doc-comment — the tile does not recolor children. This keeps the tile palette-safe (no `text-white`) while letting each caller pick the matching `colors.*` value. The `bg-z-*-soft` classes are token-backed surfaces (verify they resolve in Task U0-4; if a `*-soft` token is absent in `theme/colors.ts`/NativeWind config, fall back to the nearest existing `z-*` surface and note it — do NOT introduce a raw `green-50`/`amber-50`/`rose-50`).

- [ ] Write the test (render the glyph via a `testID`, assert sizing + that no raw palette class leaks):

```tsx
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
```

- [ ] Run, expect **FAIL**: `wsl.exe -d ubuntu bash -lc "cd /home/heinrich/dev/projects/zeta && pnpm --dir mobile jest src/components/ui/z-icon-tile.test.tsx"` → `Cannot find module './z-icon-tile'`.

## Task U0-4 — `ZIconTile` implementation

**Files:** `mobile/src/components/ui/z-icon-tile.tsx` (create).

- [ ] First, verify the `bg-z-*-soft` tokens resolve. Run `wsl.exe -d ubuntu bash -lc "cd /home/heinrich/dev/projects/zeta && grep -nE \"success|warning|danger|primary\" mobile/tailwind.config.js mobile/src/theme/*.ts 2>/dev/null | head -40"` and confirm `z-success-soft`/`z-warning-soft`/`z-danger-soft`/`z-primary-soft` are defined (the existing `ZBadge`/`ZConfirmDialog` already use `z-primary-soft`). If a `*-soft` surface for success/warning/danger is **not** wired in NativeWind, use the nearest defined `z-*` surface for that tone and record the substitution in the doc-comment — do not add a raw palette class and do not edit the generated token files by hand.
- [ ] Write the component:

```tsx
import type { ReactNode } from 'react';
import { View } from 'react-native';

export type ZIconTileTone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger';
export type ZIconTileSize = 'sm' | 'md';

/**
 * Rounded tone-mapped glyph tile. The recurring `h-10 w-10 rounded-md` icon
 * block that list rows, the danger-zone card, and section headers re-inline.
 * Background is a `z-*` token surface per tone (never a raw palette class);
 * the caller passes an already-coloured lucide glyph as `icon` so the foreground
 * matches the tone (convention: neutral→colors.primary, primary→primaryStrong,
 * success→success, warning→warning, danger→danger). Counterpart of the web
 * icon-tile used in card/list headers.
 */
const toneSurface: Record<ZIconTileTone, string> = {
  neutral: 'bg-z-surface-warm',
  primary: 'bg-z-primary-soft',
  success: 'bg-z-success-soft',
  warning: 'bg-z-warning-soft',
  danger: 'bg-z-danger-soft',
};

const sizeClasses: Record<ZIconTileSize, string> = {
  sm: 'h-9 w-9',
  md: 'h-10 w-10',
};

export function ZIconTile({
  icon,
  tone = 'neutral',
  size = 'md',
  testID,
}: {
  icon: ReactNode;
  tone?: ZIconTileTone;
  size?: ZIconTileSize;
  testID?: string;
}) {
  return (
    <View
      testID={testID}
      className={`items-center justify-center rounded-md ${sizeClasses[size]} ${toneSurface[tone]}`}
    >
      {icon}
    </View>
  );
}
```

- [ ] If Task U0-4's grep showed a `*-soft` token missing, swap that tone's class to the verified fallback and update the test's `bg-z-${tone}` expectation for that tone accordingly (keep the no-raw-palette assertion intact).
- [ ] Run, expect **PASS**: `wsl.exe -d ubuntu bash -lc "cd /home/heinrich/dev/projects/zeta && pnpm --dir mobile jest src/components/ui/z-icon-tile.test.tsx"`.
- [ ] Commit: `git add -u mobile/src/components/ui/z-icon-tile.tsx mobile/src/components/ui/z-icon-tile.test.tsx && git commit -m "feat(mobile): add ZIconTile tone-mapped glyph tile"`.

## Task U0-5 — `ZDangerZoneCard` failing test

**Files:** `mobile/src/components/ui/z-danger-zone-card.test.tsx` (create).

- [ ] Write the test. `ZConfirmDialog` renders inside a `ZDialogPanel`; copy it from `z-confirm-dialog.test.tsx`'s working pattern (the confirm/cancel buttons resolve by accessible name once visible). Wrap with `initI18n('en')` because the cancel label comes from `t('common.actions.cancel')`.

```tsx
import { render, screen, userEvent } from '@testing-library/react-native';
import { initI18n } from '../../i18n';
import { ZDangerZoneCard } from './z-danger-zone-card';

beforeAll(async () => {
  await initI18n('en');
});

const baseProps = {
  title: 'Delete group',
  description: 'This removes the group and its memberships for everyone.',
  actionLabel: 'Delete group',
  confirmTitle: 'Delete this group?',
  confirmMessage: 'This cannot be undone.',
  confirmLabel: 'Delete',
};

test('renders the title, description, and action label', async () => {
  await render(<ZDangerZoneCard {...baseProps} onAction={jest.fn()} />);
  expect(screen.getByText('Delete group')).toBeOnTheScreen();
  expect(
    screen.getByText('This removes the group and its memberships for everyone.'),
  ).toBeOnTheScreen();
});

test('pressing the action opens the confirm dialog', async () => {
  const user = userEvent.setup();
  await render(<ZDangerZoneCard {...baseProps} onAction={jest.fn()} testID="dz" />);
  expect(screen.queryByText('Delete this group?')).toBeNull();
  await user.press(screen.getByRole('button', { name: 'Delete group' }));
  expect(screen.getByText('Delete this group?')).toBeOnTheScreen();
  expect(screen.getByText('This cannot be undone.')).toBeOnTheScreen();
});

test('confirming calls onAction once and closes the dialog', async () => {
  const user = userEvent.setup();
  const onAction = jest.fn();
  await render(<ZDangerZoneCard {...baseProps} onAction={onAction} />);
  await user.press(screen.getByRole('button', { name: 'Delete group' }));
  await user.press(screen.getByRole('button', { name: 'Delete' }));
  expect(onAction).toHaveBeenCalledTimes(1);
  expect(screen.queryByText('Delete this group?')).toBeNull();
});

test('cancelling does not call onAction', async () => {
  const user = userEvent.setup();
  const onAction = jest.fn();
  await render(<ZDangerZoneCard {...baseProps} onAction={onAction} />);
  await user.press(screen.getByRole('button', { name: 'Delete group' }));
  await user.press(screen.getByRole('button', { name: 'Cancel' }));
  expect(onAction).not.toHaveBeenCalled();
  expect(screen.queryByText('Delete this group?')).toBeNull();
});

test('loading shows a spinner and disables the confirm', async () => {
  const user = userEvent.setup();
  await render(<ZDangerZoneCard {...baseProps} onAction={jest.fn()} loading testID="dz" />);
  expect(screen.getByTestId('dz-action-spinner')).toBeOnTheScreen();
  // The trigger is disabled while loading, so the dialog cannot open.
  await user.press(screen.getByRole('button', { name: 'Delete group' }));
  expect(screen.queryByText('Delete this group?')).toBeNull();
});

test('disabled blocks the trigger', async () => {
  const user = userEvent.setup();
  const onAction = jest.fn();
  await render(<ZDangerZoneCard {...baseProps} onAction={onAction} disabled />);
  const trigger = screen.getByRole('button', { name: 'Delete group' });
  expect(trigger).toBeDisabled();
  await user.press(trigger);
  expect(screen.queryByText('Delete this group?')).toBeNull();
  expect(onAction).not.toHaveBeenCalled();
});
```

- [ ] Run, expect **FAIL**: `wsl.exe -d ubuntu bash -lc "cd /home/heinrich/dev/projects/zeta && pnpm --dir mobile jest src/components/ui/z-danger-zone-card.test.tsx"` → `Cannot find module './z-danger-zone-card'`.

## Task U0-6 — `ZDangerZoneCard` implementation

**Files:** `mobile/src/components/ui/z-danger-zone-card.tsx` (create).

- [ ] Write the component. `ZButton` derives its spinner `testID` as `${testID}-spinner`, so pass the action button `testID={testID ? \`${testID}-action\` : undefined}` to make the spinner observable as `dz-action-spinner`. `ZConfirmDialog` already maps `tone='danger'` to the danger button variant + `Trash2` tone icon; we keep its `confirmDisabled` tied to `loading`.

```tsx
import { useState } from 'react';
import { Text, View } from 'react-native';
import { AlertTriangle } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { colors } from '../../theme/colors';
import { ZButton } from './z-button';
import { ZCard } from './z-card';
import { ZConfirmDialog } from './z-confirm-dialog';
import { ZIconTile } from './z-icon-tile';

/**
 * The single destructive-action card: a danger icon tile + title/description +
 * a danger button that opens a danger `ZConfirmDialog`. Shared by group-delete
 * (WP5) and account-delete (WP8). Counterpart of the web "danger zone" card.
 * `onAction` fires only after the user confirms. No raw rose-* / opacity-danger
 * styling — the danger surface comes from `ZIconTile`/`ZButton`/`ZConfirmDialog`.
 */
export function ZDangerZoneCard({
  title,
  description,
  actionLabel,
  onAction,
  loading = false,
  disabled = false,
  confirmTitle,
  confirmMessage,
  confirmLabel,
  testID,
}: {
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
  loading?: boolean;
  disabled?: boolean;
  confirmTitle: string;
  confirmMessage: string;
  confirmLabel: string;
  testID?: string;
}) {
  const { t } = useTranslation();
  const [confirmVisible, setConfirmVisible] = useState(false);

  return (
    <ZCard testID={testID}>
      <View className="flex-row items-start gap-3">
        <ZIconTile tone="danger" icon={<AlertTriangle color={colors.danger} size={20} />} />
        <View className="min-w-0 flex-1">
          <Text className="text-base font-semibold text-z-text">{title}</Text>
          <Text className="mt-1 text-sm leading-6 text-z-muted">{description}</Text>
        </View>
      </View>

      <View className="mt-4">
        <ZButton
          testID={testID ? `${testID}-action` : undefined}
          label={actionLabel}
          variant="danger"
          loading={loading}
          disabled={disabled}
          onPress={() => setConfirmVisible(true)}
        />
      </View>

      <ZConfirmDialog
        visible={confirmVisible}
        tone="danger"
        title={confirmTitle}
        description={confirmMessage}
        confirmLabel={confirmLabel}
        cancelLabel={t('common.actions.cancel')}
        confirmDisabled={loading}
        onConfirm={() => {
          setConfirmVisible(false);
          onAction();
        }}
        onCancel={() => setConfirmVisible(false)}
      />
    </ZCard>
  );
}
```

- [ ] Run, expect **PASS**: `wsl.exe -d ubuntu bash -lc "cd /home/heinrich/dev/projects/zeta && pnpm --dir mobile jest src/components/ui/z-danger-zone-card.test.tsx"`.
- [ ] Commit: `git add -u mobile/src/components/ui/z-danger-zone-card.tsx mobile/src/components/ui/z-danger-zone-card.test.tsx && git commit -m "feat(mobile): add ZDangerZoneCard destructive-action card"`.

## Task U0-7 — i18n: add `common.time.*` to the web JSON source, then sync

**Files:** `web/dashboard-next/public/i18n/{en,de,fr}.json` (modify), `mobile/src/i18n/locales/{en,de,fr}.json` (regenerated).

The shared relative-time helper needs localized bucket strings (today's `review-item` hard-codes English). Add a `common.time` block. Use i18next interpolation `{{count}}`.

- [ ] Confirm `common.labels.minutesShort` already exists (`'{{count}} min'`) — it does; reports/availability reuse it. We are NOT adding a minutes key here, only the relative-time buckets.
- [ ] In `web/dashboard-next/public/i18n/en.json`, under `common`, add (placing it next to `common.actions`/`common.labels`):

```json
"time": {
  "justNow": "just now",
  "minutesAgo": "{{count}}m ago",
  "hoursAgo": "{{count}}h ago",
  "daysAgo": "{{count}}d ago"
}
```

- [ ] Add the German equivalents to `de.json` (`"justNow": "gerade eben"`, `"minutesAgo": "vor {{count}} Min."`, `"hoursAgo": "vor {{count}} Std."`, `"daysAgo": "vor {{count}} T."`) and the French equivalents to `fr.json` (`"justNow": "à l'instant"`, `"minutesAgo": "il y a {{count}} min"`, `"hoursAgo": "il y a {{count}} h"`, `"daysAgo": "il y a {{count}} j"`). Keep each file's existing key ordering/formatting style.
- [ ] Run sync: `wsl.exe -d ubuntu bash -lc "cd /home/heinrich/dev/projects/zeta && pnpm --dir mobile run sync:i18n"`. ⚠️ **Destructive** — it drops mobile-only keys (e.g. `sessions.call.sessionFallback`). After syncing, `git diff mobile/src/i18n/locales` and **re-add by hand any mobile-only keys it removed** (see memory: i18n sync drift).
- [ ] Confirm `common.time.justNow/minutesAgo/hoursAgo/daysAgo` now exist in all three mobile locale files: `wsl.exe -d ubuntu bash -lc "cd /home/heinrich/dev/projects/zeta && for f in en de fr; do python3 -c \"import json;d=json.load(open('mobile/src/i18n/locales/$f.json'));print('$f', list(d['common']['time'].keys()))\"; done"`.
- [ ] Commit: `git add -u web/dashboard-next/public/i18n mobile/src/i18n/locales && git commit -m "i18n(mobile): add common.time relative buckets for shared datetime helper"`.

## Task U0-8 — `datetime.ts` failing test

**Files:** `mobile/src/lib/datetime.test.ts` (create).

- [ ] Write unit tests with a frozen clock and a stub `t` (the helper takes `t` so tests don't need React). The stub mirrors i18next's `t(key, { count })` contract enough to assert routing + interpolation.

```ts
import { formatDate, formatRelativeTime } from './datetime';

// Minimal i18next-style t: returns "<key>:<count?>" so we can assert the bucket
// chosen and the count passed, without booting i18n.
const t = ((key: string, opts?: { count?: number }) =>
  opts && typeof opts.count === 'number' ? `${key}:${opts.count}` : key) as never;

const NOW = new Date('2026-06-13T12:00:00.000Z').getTime();

beforeAll(() => {
  jest.spyOn(Date, 'now').mockReturnValue(NOW);
});

afterAll(() => {
  jest.restoreAllMocks();
});

const ago = (seconds: number) => new Date(NOW - seconds * 1000).toISOString();

test('under a minute → just now', () => {
  expect(formatRelativeTime(ago(30), t)).toBe('common.time.justNow');
});

test('minutes bucket → minutesAgo with count', () => {
  expect(formatRelativeTime(ago(5 * 60), t)).toBe('common.time.minutesAgo:5');
});

test('hours bucket → hoursAgo with count', () => {
  expect(formatRelativeTime(ago(3 * 3600), t)).toBe('common.time.hoursAgo:3');
});

test('days bucket → daysAgo with count', () => {
  expect(formatRelativeTime(ago(2 * 86400), t)).toBe('common.time.daysAgo:2');
});

test('over a week → absolute locale date (not a relative key)', () => {
  const out = formatRelativeTime(ago(10 * 86400), t);
  expect(out).not.toContain('common.time.');
  expect(out).toBe(formatDate(ago(10 * 86400)));
});

test('invalid / empty ISO → empty string', () => {
  expect(formatRelativeTime('', t)).toBe('');
  expect(formatRelativeTime('not-a-date', t)).toBe('');
});

test('formatDate returns a non-empty locale string for a valid ISO', () => {
  expect(formatDate('2026-06-13T12:00:00.000Z')).not.toBe('');
});

test('formatDate returns empty string for invalid ISO', () => {
  expect(formatDate('')).toBe('');
  expect(formatDate('nope')).toBe('');
});
```

- [ ] Run, expect **FAIL**: `wsl.exe -d ubuntu bash -lc "cd /home/heinrich/dev/projects/zeta && pnpm --dir mobile jest src/lib/datetime.test.ts"` → `Cannot find module './datetime'`.

## Task U0-9 — `datetime.ts` implementation + migrate `review-item.tsx`

**Files:** `mobile/src/lib/datetime.ts` (create), `mobile/src/components/review-item.tsx` (modify).

- [ ] Write the helper. Bucket boundaries are byte-for-byte the ones extracted from `review-item.tsx` (`<60`, `<3600`, `<86400`, `<604800`), now i18n-driven and with a `t`-typed signature.

```ts
import type { TFunction } from 'i18next';

/**
 * The single relative/absolute time helper for the mobile app. Consolidates the
 * formatter that used to live privately in `review-item.tsx`, the notifications
 * relative-time, and the inline reports/availability date formatting. ALL
 * relative/absolute time display goes through this module — no per-screen
 * formatters. Web uses a RelativeTimePipe; this is the lightweight mobile port,
 * now localized via `common.time.*`.
 */
export function formatRelativeTime(iso: string, t: TFunction): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const diffSec = Math.floor((Date.now() - then) / 1000);
  if (diffSec < 60) return t('common.time.justNow');
  if (diffSec < 3600) return t('common.time.minutesAgo', { count: Math.floor(diffSec / 60) });
  if (diffSec < 86400) return t('common.time.hoursAgo', { count: Math.floor(diffSec / 3600) });
  if (diffSec < 604800) return t('common.time.daysAgo', { count: Math.floor(diffSec / 86400) });
  return formatDate(iso);
}

/** Locale-aware absolute date (day/slot/absolute display). Empty on invalid input. */
export function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString();
}
```

- [ ] Run datetime test, expect **PASS**: `wsl.exe -d ubuntu bash -lc "cd /home/heinrich/dev/projects/zeta && pnpm --dir mobile jest src/lib/datetime.test.ts"`.
- [ ] **Migrate `review-item.tsx`:** delete the private `formatRelativeTime` (lines ~21-36 — the doc-comment + function); add `import { formatRelativeTime } from '../lib/datetime';`; change the meta-row call from `formatRelativeTime(review.created_at)` to `formatRelativeTime(review.created_at, t)` (the component already has `t` from `useTranslation()`). Leave `formatTimestamp` (the `m:ss` helper) untouched — it is not a date helper.
- [ ] Verify no other file imports `formatRelativeTime` from `review-item`: `wsl.exe -d ubuntu bash -lc "cd /home/heinrich/dev/projects/zeta && grep -rn \"formatRelativeTime\" mobile/src --include='*.ts*' | grep -v 'lib/datetime'"`. The only remaining match should be the call site inside `review-item.tsx`. (If any other file imported the old private function, repoint it to `../lib/datetime` — but `formatRelativeTime` was not exported from `review-item.tsx`, so there should be none.)
- [ ] Run the review-item test to confirm the migration is behaviour-preserving: `wsl.exe -d ubuntu bash -lc "cd /home/heinrich/dev/projects/zeta && pnpm --dir mobile jest src/components/review-item"`. If that test asserted the old English literal (e.g. `'5m ago'`) directly, update the expectation to the localized value rendered under `initI18n('en')` (which is identical English copy: `'5m ago'`), or assert via `t`. Keep the test green.
- [ ] Typecheck the touched files: `wsl.exe -d ubuntu bash -lc "cd /home/heinrich/dev/projects/zeta && make mobile:typecheck"` → 0 errors (confirms the `TFunction` import + `t` arg wire up).
- [ ] Commit: `git add -u mobile/src/lib/datetime.ts mobile/src/lib/datetime.test.ts mobile/src/components/review-item.tsx && git commit -m "refactor(mobile): consolidate date formatting into lib/datetime and migrate review-item"`.

## Task U0-10 — Foundation verification (whole-package green + guardrails)

**Files:** none (verification only).

- [ ] Run all four new test files + the migrated one together: `wsl.exe -d ubuntu bash -lc "cd /home/heinrich/dev/projects/zeta && pnpm --dir mobile jest src/components/ui/z-back-header src/components/ui/z-icon-tile src/components/ui/z-danger-zone-card src/lib/datetime src/components/review-item"` → all green.
- [ ] Lint + typecheck the package: `wsl.exe -d ubuntu bash -lc "cd /home/heinrich/dev/projects/zeta && make mobile:lint && make mobile:typecheck"` → 0 errors.
- [ ] Raw-palette / raw-hex guardrail scan over the four new files: `wsl.exe -d ubuntu bash -lc "cd /home/heinrich/dev/projects/zeta && grep -nE \"#[0-9a-fA-F]{3,6}|bg-(green|amber|rose|red|emerald)-[0-9]|text-white\" mobile/src/components/ui/z-back-header.tsx mobile/src/components/ui/z-icon-tile.tsx mobile/src/components/ui/z-danger-zone-card.tsx mobile/src/lib/datetime.ts || echo CLEAN"` → expect `CLEAN`.
- [ ] No commit (this Task only verifies). If anything fails, fix in the owning Task's file and re-commit there.

---

## UI Parity & Component Reuse

WP-UI0 ships **primitives**, so the "reuse" axis is what each new piece composes, not what screen it renders on. Header rule reminder for the dependents: `ZPageHeader` = the 5 **tab index** screens (compact title, no back, `text-2xl`); `ZBackHeader` = **pushed** routes (back button, `text-lg`). They are siblings, not replacements.

| New piece | Composes (existing primitive + path) | New? |
| --- | --- | --- |
| `ZBackHeader` back button | `ZIconButton` (`ArrowLeft`, `label=t('common.actions.back')`) — `mobile/src/components/ui/z-icon-button.tsx` | reuse |
| `ZBackHeader` title/subtitle/layout | RN `View`/`Text` + `z-*` text classes (`text-lg font-semibold text-z-text`, `text-sm text-z-muted`) | **NEW primitive `z-back-header.tsx`** |
| `ZIconTile` surface + glyph slot | RN `View` + `z-*` token surfaces; glyph passed by caller | **NEW primitive `z-icon-tile.tsx`** (extracts the tile block re-inlined in `z-confirm-dialog.tsx`/`z-toast.tsx`) |
| `ZDangerZoneCard` shell | `ZCard` — `mobile/src/components/ui/z-card.tsx` | reuse |
| `ZDangerZoneCard` icon tile | `ZIconTile(tone='danger', AlertTriangle)` — new in this WP | reuse (intra-WP) |
| `ZDangerZoneCard` trigger button | `ZButton(variant='danger', loading, disabled)` — `mobile/src/components/ui/z-button.tsx` | reuse |
| `ZDangerZoneCard` confirmation | `ZConfirmDialog(tone='danger')` — `mobile/src/components/ui/z-confirm-dialog.tsx` | reuse |
| `datetime.formatRelativeTime`/`formatDate` | pure TS + i18next `TFunction` + `common.time.*` keys | **NEW module `lib/datetime.ts`** |

No new dependency, no new token, no Storybook entry (mobile has none — each new primitive's file header names its web-counterpart pattern, matching the existing `z-*` files). `ZIconTile` and `ZBackHeader` are justified because no existing primitive renders a tone-mapped tile or a back-affordance header; `ZDangerZoneCard` is justified because the destructive card was previously hand-rolled per screen, which this WP exists to prevent.

## Self-Review

**Spec coverage (every WP-UI0 deliverable maps to a Task):**
- `ZBackHeader` (props `{ title, subtitle?, onBack?, action?, testID? }`, back `ZIconButton`+`ArrowLeft`+`t('common.actions.back')`, `text-lg` title, `text-sm` subtitle, default `onBack=router.back()`, pushed-route-only) → **U0-1** (test) + **U0-2** (impl).
- `ZIconTile` (props `{ icon, tone?, size?, testID? }`, md=`h-10 w-10 rounded-md`/sm=`h-9 w-9`, `tone→z-*` token map, no raw palette) → **U0-3** (test, incl. the no-`green/amber/rose-NN` assertion) + **U0-4** (impl, with the token-existence guard).
- `ZDangerZoneCard` (full prop set, `ZCard`+danger `ZIconTile`+`ZButton(danger)`+`ZConfirmDialog(danger)`, `loading`/`disabled` wiring, the single destructive card for WP5+WP8) → **U0-5** (test) + **U0-6** (impl).
- `lib/datetime.ts` (`formatRelativeTime(iso,t)` + `formatDate(iso)`, all relative/absolute display funneled here) → **U0-8** (test) + **U0-9** (impl).
- **`review-item.tsx` migration** (delete private formatter, import the shared one, pass `t`) → **U0-9** (explicit migration step + import-scan + behaviour-preserving test run).
- i18n for localized buckets (web JSON source → `sync:i18n` → mobile, re-add mobile-only keys) → **U0-7**.
- Each primitive lives in `mobile/src/components/ui/` and gets a co-located `*.test.tsx` (RNTL, async `render`, `initI18n('en')` where translated copy is asserted). The datetime test is pure (`*.test.ts`, no React) per its module nature.
- **Downstream dependency** stated up top: WP3/WP4/WP5/WP6/WP7/WP8 depend on this landing first (per-WP usage enumerated).

**Placeholder scan:** no "TBD" / "add validation" / "handle edge cases" / "similar to Task X". Every file has real, complete code; every test has concrete assertions; every command is a concrete WSL invocation. The one conditional (U0-4 `*-soft` token fallback) is a verify-then-adjust instruction with an explicit no-raw-palette guard, not a placeholder.

**Type/name consistency across the package:** `ZBackHeader`/`ZIconTile`/`ZDangerZoneCard` exported with the exact prop shapes in the contracts section and consumed verbatim by the named dependents. `ZIconTileTone`/`ZIconTileSize` are local exported unions; `ZDangerZoneCard` passes `tone='danger'`/`size` defaults that exist in those unions. Reused primitive props were each verified against the read source: `ZIconButton` (`label`, `onPress`, `children`), `ZButton` (`label`, `variant='danger'`, `loading`, `disabled`, `testID` → `${testID}-spinner`), `ZCard` (`children`, `testID`), `ZConfirmDialog` (`visible`, `tone='danger'`, `title`, `description`, `confirmLabel`, `cancelLabel`, `confirmDisabled`, `onConfirm`, `onCancel`). i18n keys referenced — `common.actions.back` (verified present, "Back"), `common.actions.cancel` (verified present, "Cancel"), `common.labels.minutesShort` (verified present, "{{count}} min", reused by dependents not added here), and the new `common.time.{justNow,minutesAgo,hoursAgo,daysAgo}` (added in U0-7).

**Guardrails:** no raw hex (icon colors via `colors.*` from `theme/colors.ts`; surfaces via NativeWind `z-*` classes); no raw Tailwind palette in the new primitives (asserted in U0-3 and grepped in U0-10); test files co-located in `components/ui/` and `lib/`, never under `src/app/`. Collision-free (no `src/app/` edit) so this runs first/early in PR #15 without blocking on screen-editing sessions. Local commits per Task; no push.
