# Mobile Storybook Coverage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up a browser-based Storybook (`@storybook/react-native-web-vite`) for the Expo app that catalogs all 42 components (29 `z-*` primitives + 13 composites) plus a page-state catalog, mirroring the Angular dashboard's Storybook DX, runnable locally — no CI/Chromatic gate yet.

**Architecture:** Storybook renders React Native components in the browser via `react-native-web`. NativeWind utilities reach the DOM through two channels wired into the Storybook Vite pipeline only (never the Expo Metro build): the `jsxImportSource: 'nativewind'` babel transform (className → style interop) injected into the framework's React plugin, and `global.css` compiled by Tailwind through an **inline** PostCSS config inside `viteFinal`. Native-only modules (expo-video, expo-camera, react-native-agora, react-native-qrcode-svg) are aliased to lightweight shims. Global decorators supply SafeAreaProvider, GestureHandlerRootView, i18next, and a token-colored background. Composites are presentational (props-only) — verified that none call `useMutation`/`useQuery` — so no QueryClient provider is needed.

**Tech Stack:** Storybook ^10.4 (matches web dashboard), `@storybook/react-native-web-vite`, `@storybook/addon-a11y`, `@storybook/addon-docs`, Vite, `@vitejs/plugin-react`, Tailwind 3 + autoprefixer (PostCSS), react-native-web 0.21, NativeWind 4. Package manager: **pnpm**, run inside WSL (`wsl.exe -d ubuntu`) from `mobile/`.

---

## Conventions for the executor

- **Run everything in WSL** from the mobile dir: `wsl.exe -d ubuntu bash -lc "cd ~/dev/projects/zeta/mobile && <cmd>"`. The Windows Bash tool cannot `cd` into the `\\wsl.localhost` UNC path.
- **Storybook/Vite are JS dev tooling, NOT native modules** — install with plain `pnpm add -D`. Do **not** use `npx expo install` for them (that rule is only for native/Expo modules). No new native dependency is added by this plan; the mocks stand in for existing native modules.
- **Commit hygiene:** stage explicit paths only (never `git add -A`/`-u` blind). No `Co-Authored-By: Claude` trailer. Work stays on the current `feat/mobile-token-auth` branch (part of the single mobile PR #15) — do not open intermediate PRs to `main`.
- **TDD adaptation:** Storybook authoring is not unit-TDD. The verification gate for each phase is **`pnpm run build-storybook` compiles cleanly** (exercises Flow-stripping + NativeWind transform + module resolution) plus a **visual render check** in `storybook dev`. Existing jest `.test.tsx` files are the unit-test layer and stay untouched — stories do not replace them.
- **Story coverage rule (applies to every component story):** the `Matrix`/`AllVariants` export must render **every value of each enumerated prop union** the component declares (variant/tone/size/shape/state) **and** the standard states that apply to it (disabled, loading, error, empty, long-text overflow, with/without optional fields). Derive the exact matrix from the component's own exported prop types — they are the source of truth. A canonical worked example is given per tier; the per-component table lists the specifics so no story is a guess.

---

## File Structure

| Path | Responsibility |
|---|---|
| `mobile/.storybook/main.ts` | Framework + stories glob + addons; injects NativeWind babel + inline PostCSS + native-module aliases via `viteFinal`. |
| `mobile/.storybook/preview.tsx` | Imports `global.css` + i18n init; registers the global providers decorator; parameters. |
| `mobile/.storybook/i18n-storybook.ts` | Synchronous i18next init for Storybook (same 3 locale JSONs as the app). |
| `mobile/.storybook/decorators.tsx` | `withProviders` global decorator (SafeAreaProvider + GestureHandlerRootView + token background). |
| `mobile/.storybook/mocks/expo-video.tsx` | Shim for expo-video API used by `z-video-preview`. |
| `mobile/.storybook/mocks/expo-camera.tsx` | Shim for expo-camera (QR scanner surfaces). |
| `mobile/.storybook/mocks/react-native-agora.tsx` | Shim for the Agora call SDK. |
| `mobile/.storybook/tsconfig.json` | TS config so `.storybook` type-checks against the app. |
| `mobile/src/components/ui/z-*.stories.tsx` | 29 primitive stories (co-located). |
| `mobile/src/components/*.stories.tsx` | 13 composite stories (co-located). |
| `mobile/src/components/__stories__/fixtures.ts` | Shared mock entities (Group, Asset, Member, Booking, Notification, Review, SessionType, Stat, UploadProgress) for composite + page stories. |
| `mobile/src/app/__stories__/core-flow-states.stories.tsx` | Page-state catalog (loading/empty/error/data) mirroring web `Pages/Core Flow States`. |
| `mobile/package.json` | `storybook` + `build-storybook` scripts; new devDependencies. |
| `mobile/.gitignore` | Ignore `storybook-static/`. |

> ⚠️ **Do NOT create a root `mobile/postcss.config.js`.** Expo's Metro web pipeline would pick it up and change how `global.css` is processed for `expo start --web`. PostCSS is configured **inline** in `viteFinal` so it is scoped to Storybook only.

> ⚠️ **Do NOT place any `*.stories.tsx` under `src/app/`** except inside the `src/app/__stories__/` folder, and confirm expo-router ignores `__stories__` (underscore-prefixed dirs are not routes). Per `mobile/AGENTS.md`, files under `src/app/` otherwise become routes. If in doubt, relocate the page catalog to `src/__stories__/`.

---

## Phase 0 — Spike Gate (de-risk before authoring 42 stories)

**Purpose:** Prove the bleeding-edge pipeline (Vite + RNW 0.21 + NativeWind 4 + RN 0.85 + React 19.2) renders correctly on the three real risk axes BEFORE investing in full coverage. If it fails, fall back (see "Fallback" below) without having written throwaway stories.

### Task 0: Spike

**Files:**
- Create: `mobile/.storybook/main.ts`, `mobile/.storybook/preview.tsx`, `mobile/.storybook/i18n-storybook.ts`, `mobile/.storybook/decorators.tsx`, `mobile/.storybook/tsconfig.json`
- Create: `mobile/src/components/ui/z-button.stories.tsx`, `mobile/src/components/ui/z-badge.stories.tsx`, `mobile/src/components/ui/z-icon-button.stories.tsx` (3 risk-representative stories)
- Modify: `mobile/package.json` (deps + scripts), `mobile/.gitignore`

- [ ] **Step 1: Install Storybook tooling**

```bash
pnpm add -D storybook@^10.4 @storybook/react-native-web-vite@^10.4 @storybook/addon-a11y@^10.4 @storybook/addon-docs@^10.4 vite @vitejs/plugin-react autoprefixer
```

- [ ] **Step 2: Verify the framework package resolved and inspect its options API**

```bash
pnpm ls @storybook/react-native-web-vite
ls node_modules/@storybook/react-native-web-vite/dist/*.d.ts
```
Expected: a single resolved version (`^10.4.x`). Open the framework's exported `StorybookConfig`/`FrameworkOptions` type to confirm the exact option names for injecting babel presets (the names below — `pluginReactOptions` / `modulesToTranspile` — are the likely API; adjust to whatever the installed version exposes). This is the one place the version may differ; everything downstream depends on getting `jsxImportSource: 'nativewind'` into the React babel transform.

- [ ] **Step 3: Write `.storybook/main.ts`**

```ts
import type { StorybookConfig } from '@storybook/react-native-web-vite';
import { mergeConfig } from 'vite';
import path from 'node:path';
import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(ts|tsx)'],
  addons: ['@storybook/addon-a11y', '@storybook/addon-docs'],
  framework: {
    name: '@storybook/react-native-web-vite',
    options: {
      // Inject NativeWind's className → style transform into the React/babel pass.
      // Option name verified in Step 2 against the installed version's types.
      pluginReactOptions: {
        jsxImportSource: 'nativewind',
        babel: {
          presets: [['babel-preset-expo', { jsxImportSource: 'nativewind' }], 'nativewind/babel'],
        },
      },
    },
  },
  async viteFinal(cfg) {
    return mergeConfig(cfg, {
      // PostCSS is inline (Storybook-scoped) so Expo's Metro web build is never affected.
      css: {
        postcss: {
          plugins: [
            tailwindcss(path.resolve(__dirname, '../tailwind.config.js')),
            autoprefixer(),
          ],
        },
      },
      resolve: {
        alias: {
          'expo-video': path.resolve(__dirname, 'mocks/expo-video.tsx'),
          'expo-camera': path.resolve(__dirname, 'mocks/expo-camera.tsx'),
          'react-native-agora': path.resolve(__dirname, 'mocks/react-native-agora.tsx'),
          // Reuse the existing jest mock — no new file needed.
          'react-native-qrcode-svg': path.resolve(__dirname, '../src/__mocks__/react-native-qrcode-svg.tsx'),
        },
      },
    });
  },
};
export default config;
```

- [ ] **Step 4: Write `.storybook/i18n-storybook.ts`**

```ts
import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from '../src/i18n/locales/en.json';
import de from '../src/i18n/locales/de.json';
import fr from '../src/i18n/locales/fr.json';

// Synchronous, Suspense-free init mirroring src/i18n/index.ts for the Storybook runtime.
if (!i18next.isInitialized) {
  void i18next.use(initReactI18next).init({
    lng: 'en',
    fallbackLng: 'en',
    resources: { en: { translation: en }, de: { translation: de }, fr: { translation: fr } },
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
  });
}

export default i18next;
```

- [ ] **Step 5: Write `.storybook/decorators.tsx`**

```tsx
import type { ReactNode } from 'react';
import { View } from 'react-native';
import { SafeAreaProvider, type Metrics } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import type { Decorator } from '@storybook/react';

// iPhone-14-class mock so z-screen / z-toast resolve non-zero safe-area insets in the browser.
const MOCK_METRICS: Metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

export const withProviders: Decorator = (Story) => (
  <GestureHandlerRootView style={{ flex: 1 }}>
    <SafeAreaProvider initialMetrics={MOCK_METRICS}>
      {/* Paint the Zeta canvas background so token colors read correctly. */}
      <View className="flex-1 bg-z-bg p-4">
        <Story />
      </View>
    </SafeAreaProvider>
  </GestureHandlerRootView>
);
```

- [ ] **Step 6: Write `.storybook/preview.tsx`**

```tsx
import type { Preview } from '@storybook/react';
import './i18n-storybook';
import '../global.css';
import { withProviders } from './decorators';

const preview: Preview = {
  parameters: {
    backgrounds: { disable: true }, // we paint our own z-bg in the decorator
    a11y: { test: 'todo' },
    controls: { expanded: true },
  },
  decorators: [withProviders],
};

export default preview;
```

- [ ] **Step 7: Write `.storybook/tsconfig.json`**

```json
{
  "extends": "../tsconfig.json",
  "include": ["../src", "./**/*"],
  "compilerOptions": {
    "types": ["node"]
  }
}
```

- [ ] **Step 8: Write the 3 spike stories**

`src/components/ui/z-button.stories.tsx` (NativeWind token CSS — the canonical primitive template; see Task 6 for the full file). `src/components/ui/z-badge.stories.tsx` (tone matrix). `src/components/ui/z-icon-button.stories.tsx` (renders a `lucide-react-native` icon → exercises `react-native-svg` in the browser). Use the Task 6 canonical pattern. Minimum viable for the spike: each exports a `Matrix` story rendering every variant/tone with at least one lucide icon present in the icon-button story.

- [ ] **Step 9: Add scripts to `package.json`**

```jsonc
"scripts": {
  // ...existing...
  "storybook": "storybook dev -p 6006",
  "build-storybook": "storybook build"
}
```

- [ ] **Step 10: Ignore the build output**

Append to `mobile/.gitignore`:
```
# Storybook
storybook-static/
```

- [ ] **Step 11: GATE A — build must compile**

```bash
pnpm run build-storybook
```
Expected: completes with `Storybook X.X.X built` and a `storybook-static/` dir; **no** errors about unparsable Flow syntax, missing `react-native` resolution, or PostCSS/Tailwind failures. A build failure here is the spike telling you the pipeline needs adjustment — read the error and map it to the Fallback table before proceeding.

- [ ] **Step 12: GATE B — visual render check**

```bash
pnpm run storybook
```
Then load `http://localhost:6006` (WSL→Windows localhost forwarding usually works; if not, use `storybook dev -p 6006 --host 0.0.0.0` and the WSL IP, or screenshot the running server with the browser MCP). Confirm visually:
1. **z-button Matrix** — primary is Zeta orange (`#ea580c`), secondary has a border, text is the warm-dark token (`#26180f`) — i.e. `var(--z-*)` tokens resolved (NativeWind CSS pipeline ✅).
2. **z-icon-button** — the lucide icon renders as crisp SVG (`react-native-svg` under RNW ✅).
3. No console error about `useSafeAreaInsets`/i18n context (providers ✅).

- [ ] **Step 13: Spike decision + commit**

If both gates pass → commit and proceed to Phase 1:
```bash
git add mobile/.storybook mobile/src/components/ui/z-button.stories.tsx mobile/src/components/ui/z-badge.stories.tsx mobile/src/components/ui/z-icon-button.stories.tsx mobile/package.json mobile/pnpm-lock.yaml mobile/.gitignore
git commit -m "feat(mobile): bootstrap react-native-web-vite storybook (spike)"
```
If a gate fails → **STOP**, document the failing axis in `.agents/reports/`, and apply Fallback. Do not author the remaining 39 stories.

**Fallback table (only if Phase 0 fails):**

| Failure axis | Symptom | Fallback |
|---|---|---|
| NativeWind tokens absent | components render unstyled / no colors | Verify `global.css` import path + inline PostCSS picks up `tailwind.config.js` content glob; if NativeWind-web fundamentally fights Vite → switch to **on-device `@storybook/react-native`** (Metro, native NativeWind) or the **kitchen-sink route** (`src/app/_dev/components.tsx`). |
| Flow parse error in an RN dep | esbuild chokes on `type`/Flow syntax | add the dep to the framework's `modulesToTranspile`/babel include; if intractable → on-device fallback. |
| SVG/icon blank | lucide icon empty | confirm `react-native-svg` resolves to its web build; alias if needed. |

---

## Phase 1 — Shared Fixtures

### Task 1: Composite & page fixtures

**Files:**
- Create: `mobile/src/components/__stories__/fixtures.ts`

- [ ] **Step 1: Read the entity types** each composite consumes (`src/api/queries/*.ts` for `Group`, `Asset`, `Member`, `Booking`, `Notification`, `Review`, `SessionType`; component prop types for `StatCard`, `UploadProgressCard`, `FirstStepRow`, `ScheduleDayRow`, `ReviewItem`). The fixtures must satisfy these exact types.

- [ ] **Step 2: Write `fixtures.ts`** — one representative + one edge-case (long text / missing optional fields) value per entity. Skeleton (fill fields to match the real types read in Step 1):

```ts
import type { Group } from '../../api/queries/groups';
// import the remaining entity types similarly

export const mockGroup: Group = {
  id: 'grp_1',
  name: 'U15 Strikers',
  description: 'Tuesday & Thursday finishing drills',
  avatar: null,
  // ...complete to match the Group type
} as Group;

export const mockGroupLong: Group = {
  ...mockGroup,
  id: 'grp_2',
  name: 'Regional Development Squad — Northern Conference Under-15 Boys',
  description:
    'A very long description that should wrap to exactly two lines and then truncate with an ellipsis so the card layout can be validated under overflow.',
} as Group;

// Repeat: mockAsset/mockAssetProcessing/mockAssetFailed, mockMember/mockMemberPending,
// mockBookingUpcoming/mockBookingPast, mockNotificationUnread/mockNotificationRead,
// mockReview, mockSessionType, mockStat, mockUploadInProgress/mockUploadFailed.
```

- [ ] **Step 3: Type-check** `wsl.exe -d ubuntu bash -lc "cd ~/dev/projects/zeta/mobile && pnpm exec tsc --noEmit"` — fixtures must satisfy the real types. Expected: no errors in `fixtures.ts`.

- [ ] **Step 4: Commit**
```bash
git add mobile/src/components/__stories__/fixtures.ts
git commit -m "feat(mobile): add storybook fixtures for composite stories"
```

---

## Phase 2 — Native-module mocks

### Task 2: Shim files

**Files:**
- Create: `mobile/.storybook/mocks/expo-video.tsx`, `mobile/.storybook/mocks/expo-camera.tsx`, `mobile/.storybook/mocks/react-native-agora.tsx`

- [ ] **Step 1: Read the real import surface** — open `src/components/ui/z-video-preview.tsx` (and any camera/agora consumers) and list exactly which named exports/hooks they import (e.g. `VideoView`, `useVideoPlayer`). The mock must export those names with compatible signatures.

- [ ] **Step 2: Write `mocks/expo-video.tsx`** (adjust exports to match Step 1):

```tsx
import { View, Text } from 'react-native';

export function VideoView(props: { style?: unknown; className?: string }) {
  return (
    <View className="aspect-video w-full items-center justify-center rounded-lg bg-z-surface-muted">
      <Text className="text-sm text-z-muted">▶ video (storybook mock)</Text>
    </View>
  );
}

export function useVideoPlayer() {
  return { play() {}, pause() {}, replace() {}, muted: true, loop: false };
}
```

- [ ] **Step 3: Write `mocks/expo-camera.tsx`** and `mocks/react-native-agora.tsx`** — same pattern: a placeholder `View` for any view export, no-op functions/hooks for any imperative export named in Step 1.

- [ ] **Step 4: Verify build still green**
```bash
pnpm run build-storybook
```
Expected: builds; `z-video-preview` (once its story exists) renders the placeholder, not a crash.

- [ ] **Step 5: Commit**
```bash
git add mobile/.storybook/mocks
git commit -m "feat(mobile): add storybook shims for native-only modules"
```

---

## Phase 3 — Primitive stories (Tier A · 29)

### Task 6: Canonical primitive + remaining 28

**Canonical worked example — `src/components/ui/z-button.stories.tsx`** (already created in the spike; this is its full intended form):

```tsx
import type { Meta, StoryObj } from '@storybook/react';
import { View } from 'react-native';
import { LucidePlus } from 'lucide-react-native';
import { ZButton } from './z-button';

const meta = {
  title: 'UI/Button',
  component: ZButton,
  args: { label: 'Upload video', variant: 'primary', disabled: false, loading: false },
  argTypes: {
    variant: { control: 'radio', options: ['primary', 'secondary', 'ghost', 'danger', 'link'] },
    disabled: { control: 'boolean' },
    loading: { control: 'boolean' },
  },
} satisfies Meta<typeof ZButton>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

// Matrix: every variant × the states the component supports.
export const Matrix: Story = {
  render: () => (
    <View className="gap-3">
      {(['primary', 'secondary', 'ghost', 'danger', 'link'] as const).map((variant) => (
        <View key={variant} className="flex-row flex-wrap items-center gap-3">
          <ZButton label={variant} variant={variant} onPress={() => {}} />
          <ZButton label="disabled" variant={variant} disabled onPress={() => {}} />
          <ZButton label="loading" variant={variant} loading onPress={() => {}} />
          <ZButton label="icon" variant={variant} icon={<LucidePlus size={16} color="#fff" />} onPress={() => {}} />
        </View>
      ))}
    </View>
  ),
};
```

- [ ] **Step 1: Author all 29 primitive stories** following the canonical pattern. Each file: `Playground` (argTypes from the component's prop union) + `Matrix` (full coverage per the table). Title `UI/<Name>` to mirror the web dashboard taxonomy. Coverage specifics:

| Component | `Matrix` must render |
|---|---|
| z-button ✅ | 5 variants × {default, disabled, loading, icon} |
| z-badge ✅ | tones: neutral, primary, success, warning, danger |
| z-icon-button ✅ | variants×sizes×shapes + a lucide icon; disabled |
| z-icon-tile | tones (5) × sizes (sm, md) |
| z-avatar | shapes (rounded, circle) × sizes × {image set, fallback initials} |
| z-avatar-input | {empty, with image} + the avatar hint helper text |
| z-toast | tones: success, error, info |
| z-confirm-dialog | tones: info, warning, danger (open state) |
| z-stepper | step states: completed, active, upcoming across a 3-step sample |
| z-tabs | 2-tab + 3-tab, each with an active selection |
| z-select | closed + open list; placeholder vs selected |
| z-combobox | empty query, results, no-results |
| z-checkbox | checked, unchecked, disabled |
| z-chip | selected, unselected (+ long label) |
| z-card | with/without header; default padding |
| z-text-input | empty, filled, error (with z-field-error), disabled |
| z-textarea | empty, filled, error |
| z-field-label | required vs optional |
| z-field-error | with message vs none |
| z-empty-state | icon + title + body + optional action |
| z-skeleton | a few sizes/shapes (line, block, circle) |
| z-danger-zone-card | default destructive layout |
| z-dialog-panel | open panel with sample content |
| z-page-header | title only, title + subtitle, with trailing action |
| z-back-header | with title, with/without right action |
| z-query-error | error message + retry button |
| z-keyboard-avoiding-view | wraps a text input (static render) |
| z-screen | renders children inside safe-area padding (insets visible) |
| z-video-preview | renders via the expo-video mock placeholder |

> For any component above whose exact prop names you are unsure of, **read the component file first** — its exported prop type is authoritative. Do not guess prop names.

- [ ] **Step 2: Build gate after every ~6 stories** (catch a bad import early):
```bash
pnpm run build-storybook
```
Expected: green. If a single story breaks the build, fix it before continuing.

- [ ] **Step 3: Lint**
```bash
pnpm run lint
```
Expected: no new errors in the story files.

- [ ] **Step 4: Commit (in 2–3 logical batches, not one giant commit)**
```bash
git add mobile/src/components/ui/z-*.stories.tsx
git commit -m "feat(mobile): storybook stories for z-* primitives"
```

---

## Phase 4 — Composite stories (Tier B · 13)

### Task 7: Canonical composite + remaining 12

**Canonical worked example — `src/components/group-card.stories.tsx`:**

```tsx
import type { Meta, StoryObj } from '@storybook/react';
import { View } from 'react-native';
import { GroupCard } from './group-card';
import { mockGroup, mockGroupLong } from './__stories__/fixtures';

const meta = {
  title: 'Components/Group Card',
  component: GroupCard,
} satisfies Meta<typeof GroupCard>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { group: mockGroup, onPress: () => {} },
};

// Edge cases: long name/description (overflow), and missing description (i18n fallback copy).
export const States: Story = {
  render: () => (
    <View className="gap-3">
      <GroupCard group={mockGroup} onPress={() => {}} />
      <GroupCard group={mockGroupLong} onPress={() => {}} />
      <GroupCard group={{ ...mockGroup, description: null } as typeof mockGroup} onPress={() => {}} />
    </View>
  ),
};
```

- [ ] **Step 1: Author all 13 composite stories** (`Default` + `States`), title `Components/<Name>`, fixtures from `__stories__/fixtures.ts`, all callbacks as `() => {}`. Components: asset-card, booking-card, first-step-row, group-card ✅, member-row, notification-bell, notification-row, review-composer, review-item, schedule-day-row, session-type-row, stat-card, upload-progress-card. Each `States` export must cover the component's meaningful variations — e.g. asset-card: {processing, ready, failed}; booking-card: {upcoming, past}; notification-row: {unread, read}; upload-progress-card: {in-progress %, failed}; stat-card: {short title, wrapping title}; member-row: {active, pending}. Derive exact status enums by reading each component + its entity type.

- [ ] **Step 2: Build + lint gate**
```bash
pnpm run build-storybook && pnpm run lint
```
Expected: green.

- [ ] **Step 3: Commit**
```bash
git add mobile/src/components/*.stories.tsx
git commit -m "feat(mobile): storybook stories for composite components"
```

---

## Phase 5 — Page-state catalog (Tier C)

### Task 8: Core flow states

**Files:**
- Create: `mobile/src/app/__stories__/core-flow-states.stories.tsx` (confirm `__stories__` under `src/app/` is ignored by expo-router; if it is treated as a route, relocate to `src/__stories__/core-flow-states.stories.tsx`).

- [ ] **Step 1: Confirm router ignores the folder**
```bash
wsl.exe -d ubuntu bash -lc "cd ~/dev/projects/zeta/mobile && grep -rn '__stories__\|stories' app.json metro.config.js 2>/dev/null; echo 'check expo-router ignore'"
```
If unsure, use `src/__stories__/` (outside `app/`) — safest, and the story is presentational so its location is irrelevant to coverage.

- [ ] **Step 2: Author the catalog** — mirror web `Pages/Core Flow States`. For each of the key surfaces (Sessions list, Groups list, Asset review), render the **four states** the parity rules mandate (pending → `ZSkeleton`, error → `ZQueryError` + retry, empty → `ZEmptyState`, data → real composites with fixtures). Compose from existing primitives/composites with explicit state props — **do not** mount real route screens (avoids the query/router runtime). Title `Pages/Core Flow States`. Skeleton:

```tsx
import type { Meta, StoryObj } from '@storybook/react';
import { View, Text } from 'react-native';
import { ZSkeleton } from '../../components/ui/z-skeleton';
import { ZEmptyState } from '../../components/ui/z-empty-state';
import { ZQueryError } from '../../components/ui/z-query-error';
import { GroupCard } from '../../components/group-card';
import { mockGroup } from '../../components/__stories__/fixtures';

const meta = { title: 'Pages/Core Flow States' } satisfies Meta;
export default meta;
type Story = StoryObj;

function Section({ name, children }: { name: string; children: React.ReactNode }) {
  return (
    <View className="gap-2">
      <Text className="text-xs font-semibold uppercase text-z-muted">{name}</Text>
      {children}
    </View>
  );
}

export const Groups: Story = {
  render: () => (
    <View className="gap-6">
      <Section name="Loading"><ZSkeleton /></Section>
      <Section name="Error"><ZQueryError onRetry={() => {}} /></Section>
      <Section name="Empty"><ZEmptyState title="No groups yet" /></Section>
      <Section name="Data"><GroupCard group={mockGroup} onPress={() => {}} /></Section>
    </View>
  ),
};
// Repeat Sessions and AssetReview exports with their own four-state compositions.
```
> Adjust each primitive's props to its real signature (read `z-empty-state.tsx`, `z-query-error.tsx`, `z-skeleton.tsx`).

- [ ] **Step 3: Build + lint gate**
```bash
pnpm run build-storybook && pnpm run lint
```
Expected: green.

- [ ] **Step 4: Commit**
```bash
git add mobile/src/app/__stories__/core-flow-states.stories.tsx
git commit -m "feat(mobile): storybook page-state catalog (core flow states)"
```

---

## Phase 6 — Final verification & record

### Task 9: Verify and document

- [ ] **Step 1: Full build**
```bash
wsl.exe -d ubuntu bash -lc "cd ~/dev/projects/zeta/mobile && pnpm run build-storybook"
```
Expected: `Storybook built` with all 42 component stories + page catalog, no errors.

- [ ] **Step 2: Story count sanity**
```bash
wsl.exe -d ubuntu bash -lc "cd ~/dev/projects/zeta/mobile && find src -name '*.stories.tsx' | wc -l"
```
Expected: **43** (29 primitives + 13 composites + 1 page catalog).

- [ ] **Step 3: Typecheck + lint + existing tests still pass**
```bash
wsl.exe -d ubuntu bash -lc "cd ~/dev/projects/zeta/mobile && pnpm exec tsc --noEmit && pnpm run lint && pnpm test"
```
Expected: all green — stories did not touch the jest suite.

- [ ] **Step 4: Dev smoke + screenshot** — `pnpm run storybook`, open `http://localhost:6006`, spot-check one story per tier renders with correct Zeta tokens. Capture a screenshot for the PR (per `mobile/AGENTS.md`: UI changes need an emulator/render screenshot).

- [ ] **Step 5: Write completion report** to `.agents/reports/<timestamp>_mobile_storybook_coverage.md` — context, what shipped (43 stories, infra), spike outcome, verification output, and follow-ups (on-device Storybook for true-native checks, Chromatic + CI parity gate against web titles) explicitly deferred per the design.

- [ ] **Step 6: Final commit**
```bash
git add .agents/reports/<timestamp>_mobile_storybook_coverage.md
git commit -m "docs(mobile): storybook coverage completion report"
```

---

## Self-Review (filled by author)

**Spec coverage:** Workbench = RNW-Vite ✅ (Task 0–2). Spike-gate-first ✅ (Phase 0 + Fallback table). Scope = 42 components + page catalog ✅ (Phases 3–5, 43 stories). CI = local only ✅ (scripts but no `ci.yml` change; Chromatic deferred). Provider needs (i18n/safe-area) ✅ (Task 0); QueryClient correctly dropped (verified no composite calls hooks). PostCSS contamination risk handled ✅ (inline in `viteFinal`). expo-router route-collision risk flagged ✅ (Task 8 Step 1).

**Placeholder scan:** Infra files (main/preview/i18n/decorators/mocks) have complete code. Story tasks give a complete canonical file per tier + an exact per-component coverage table rather than 42 redundant transcriptions — the matrix is mechanically derived from each component's own prop union (named source of truth), which is a precise spec, not a "TODO". Fixtures task shows the pattern + instructs reading the real entity types (which only exist in the repo, not inventable here).

**Type consistency:** `withProviders` (decorators.tsx) ↔ imported in preview.tsx ✅. Mock alias paths ↔ mock filenames ✅. Story titles use a consistent taxonomy: `UI/*`, `Components/*`, `Pages/*` ✅. Script names `storybook`/`build-storybook` consistent across all gates ✅.

**Open risk:** the single version-dependent unknown is the `@storybook/react-native-web-vite` framework option name for injecting the NativeWind babel preset (Task 0 Step 2 verifies it against installed types). Everything else is standard. This is exactly what Phase 0 exists to catch before scale.
