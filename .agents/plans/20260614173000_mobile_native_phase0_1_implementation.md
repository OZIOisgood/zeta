# Mobile Platform-Adaptive Native UI — Phase 0+1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** De-risk the native-adaptive approach on real iOS+Android dev builds (Phase 0), then build the guardrails and token/foundation layer that everything else depends on (Phase 1).

**Architecture:** `z-*` primitives keep one public API; internals branch per platform (`.ios.tsx`/`.android.tsx`) and render `@expo/ui` (SwiftUI/Jetpack Compose) for native surfaces, with the bare `.tsx` staying a complete NativeWind web/Storybook fallback. Brand is a single accent token fed to both NativeWind classes and a `theme/native.ts` token→modifier adapter from one generated `theme/roles.ts`. Guardrails (lint/CI/agents/AGENTS.md) are built BEFORE the bulk migration so it can't drift back to web-parity.

**Tech Stack:** Expo SDK 56, React Native 0.85.3, React 19.2, New Architecture, expo-router, `@expo/ui ~56.0.17`, NativeWind 4, `expo-symbols`, `expo-haptics` (to install), `burnt` (to evaluate), `react-native-screens` 4.25.2 (native-stack `formSheet`), jest + RNTL, ESLint flat config.

**Source spec (approved + committed `606ec8b`):** `.agents/plans/20260614172400_mobile_platform_adaptive_native_design.md`.

**Environment (binding):**
- All shell commands run through WSL: `wsl.exe -d ubuntu bash -lc "cd ~/dev/projects/zeta/mobile && <cmd>"`.
- Edit files via the UNC path `\\wsl.localhost\ubuntu\home\heinrich\dev\projects\zeta`.
- Single mobile PR (#15) on `feat/mobile-token-auth`; commit per task; **no intermediate merges to `main`; never `git push` without asking.** No `Co-Authored-By` trailer.

**Scope:** Phase 0 + Phase 1 only. Phases 2–5 (high-leverage controls, modal cluster, navigation, polish) are deliberately out of scope and get their own plan after the Phase 0 spike report lands — their detailed steps must not be written on unvalidated assumptions (burnt compat, `@expo/ui` Host sizing, `formSheet` quirks).

**Spike honesty:** Phase 0 validates native behavior that jest cannot test (SwiftUI/Compose render on the native thread). Its gate is **observation on a real device build**, not a jest assertion. Where a Phase-0 task names exact `@expo/ui` props, the FIRST step is always "confirm the prop names against `node_modules/@expo/ui` types + https://docs.expo.dev/versions/v56.0.0/" — treat the API shapes below as best-known, not gospel. Phase 1 tasks (config, tokens, adapter, Touchable) are fully TDD-able and show real code.

---

## File Structure

**Phase 0 (spike — kept if it validates):**
- `mobile/src/components/ui/z-button.types.ts` · `z-button.ios.tsx` · `z-button.android.tsx` (bare `z-button.tsx` stays the web fallback)
- `mobile/src/components/ui/z-select.types.ts` · `z-select.ios.tsx` · `z-select.android.tsx`
- `mobile/src/app/confirm/[action].tsx` (native `formSheet` route for confirm-with-input) + `z-confirm-dialog` routing
- `mobile/src/components/ui/z-toast.ios.tsx` · `z-toast.android.tsx` (host only; store unchanged)
- `mobile/src/app/(tabs)/profile.tsx` (the one full screen converted end-to-end)
- `.agents/reports/<ts>_mobile_native_spike_report.md` (validation findings → feeds Phase 2–5 planning)

**Phase 1 (foundation — load-bearing):**
- `mobile/AGENTS.md` (rewrite), `.claude/agents/mobile-dev.md`, `.claude/agents/mobile-reviewer.md`, `.codex/agents/mobile-reviewer.toml` (update)
- `mobile/eslint.config.js` (restricted-imports + no-hex), `mobile/scripts/check-tokens-synced.mjs` + Makefile/CI wiring
- `mobile/src/theme/roles.ts` (generated light+dark role tokens), `mobile/scripts/sync-tokens.mjs` (extend), `mobile/tailwind.config.js` + `mobile/global.css` (roles + dark)
- `mobile/src/theme/native.ts` (token→modifier adapter)
- `mobile/src/components/ui/touchable.tsx` (+ `expo-haptics`)
- `mobile/src/components/ui/z-symbol.tsx` (expo-symbols wrapper)
- `mobile/src/components/ui/tiers.ts` (tier manifest) + `mobile/src/__tests__/primitive-contract.test.ts`

---

# PHASE 0 — De-risk spike

### Task 0.1: Pin SDK patches and install native deps

**Files:**
- Modify: `mobile/package.json` (via `expo install`, do not hand-edit versions)

- [ ] **Step 1: Bump to the latest 56.x patches for the native-UI packages**

Run:
```
wsl.exe -d ubuntu bash -lc "cd ~/dev/projects/zeta/mobile && npx expo install @expo/ui expo-symbols expo-glass-effect react-native-screens"
```
Expected: each resolves to the highest SDK-56-compatible patch (≥ `@expo/ui` 56.0.17). Note the resolved versions in the spike report.

- [ ] **Step 2: Install expo-haptics (SDK-correct version)**

Run: `wsl.exe -d ubuntu bash -lc "cd ~/dev/projects/zeta/mobile && npx expo install expo-haptics"`
Expected: adds `expo-haptics` (~56.x) to `package.json`. (Never guess the semver — `expo install` picks the SDK-correct one.)

- [ ] **Step 3: Install burnt for the toast spike**

Run: `wsl.exe -d ubuntu bash -lc "cd ~/dev/projects/zeta/mobile && npx expo install burnt"`
Expected: adds `burnt`. If `expo install` errors on peer ranges, record the error verbatim in the spike report and proceed — burnt is on trial; the fallback is `react-native-toast-message`.

- [ ] **Step 4: Rebuild the dev client (native modules added)**

Run: `wsl.exe -d ubuntu bash -lc "cd ~/dev/projects/zeta/mobile && npx expo prebuild --clean"` then build/install the dev client per the project emulator setup (EAS or local). 
Expected: dev client builds without `NoClassDefFoundError`/autolinking errors. A failed Android build naming `burnt` → uninstall burnt and mark the toast path "fallback" in the report.

- [ ] **Step 5: Commit**

```
git add mobile/package.json mobile/pnpm-lock.yaml
git commit -m "chore(mobile): add expo-haptics, burnt, pin @expo/ui/symbols patches for native spike"
```

---

### Task 0.2: Spike `ZButton` as a native adaptive primitive

**Files:**
- Create: `mobile/src/components/ui/z-button.types.ts`, `z-button.ios.tsx`, `z-button.android.tsx`
- Keep: `mobile/src/components/ui/z-button.tsx` (current impl becomes the web fallback — unchanged)
- Test: `mobile/src/components/ui/z-button.test.tsx` (already exists — must keep passing against the bare fallback)

- [ ] **Step 1: Confirm the `@expo/ui` Button + Host API**

Read `node_modules/@expo/ui/build/*` types for `Button` and `Host` (iOS `swift-ui`, Android `jetpack-compose`) and cross-check https://docs.expo.dev/versions/v56.0.0/sdk/ui/. Record the exact import paths, the variant/role prop names, and how children/labels are passed in the spike report.

- [ ] **Step 2: Extract the shared prop contract**

Create `z-button.types.ts` with the EXACT current public props (copied from `z-button.tsx`) so all three files share one type:
```ts
import type { ReactNode } from 'react';
export type ZButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'link';
export type ZButtonProps = {
  label: string;
  onPress?: () => void;
  variant?: ZButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  icon?: ReactNode;
  testID?: string;
};
```

- [ ] **Step 3: Update the bare fallback to consume the shared type**

In `z-button.tsx`, replace the inline prop type with `import type { ZButtonProps, ZButtonVariant } from './z-button.types'` and `export function ZButton(props: ZButtonProps)`. No behavior change.

- [ ] **Step 4: Run existing test against the fallback to confirm parity**

Run: `wsl.exe -d ubuntu bash -lc "cd ~/dev/projects/zeta/mobile && pnpm exec jest z-button"`
Expected: PASS (jest resolves the bare `.tsx`; behavior unchanged).

- [ ] **Step 5: Implement `z-button.ios.tsx` with `@expo/ui` SwiftUI Button**

Using the API confirmed in Step 1, render a SwiftUI `Button` inside `<Host>`, mapping `variant` → button role (primary→prominent, danger→destructive/red, link→plain) and the brand tint (hardcode the orange hex `#ea580c` for the spike; Phase 1 replaces it with the role token). Honor `disabled`/`loading`/`icon`. Keep the same `testID`.

- [ ] **Step 6: Implement `z-button.android.tsx` with `@expo/ui` Compose Button**

Same contract; map `variant` → Compose button type (primary→filled, secondary→outlined, ghost/link→text), brand color via the Material color argument. `android_ripple` is native here.

- [ ] **Step 7: Validate on a real iOS + Android dev build**

Add a temporary `ZButton` of each variant to `profile.tsx` (or a scratch route). Run on both dev builds. Observe: native press feedback (iOS opacity / Android ripple), correct tint, destructive=red, disabled/loading states, layout inside `<Host>` (no zero-height/clipping). Capture one screenshot per platform.

- [ ] **Step 8: Record findings + commit**

Note in the spike report: confirmed API, Host sizing behavior, any quirks. Then:
```
git add mobile/src/components/ui/z-button.types.ts mobile/src/components/ui/z-button.tsx mobile/src/components/ui/z-button.ios.tsx mobile/src/components/ui/z-button.android.tsx
git commit -m "feat(mobile): spike native adaptive ZButton via @expo/ui"
```

---

### Task 0.3: Spike `ZSelect` → native Picker/Menu

**Files:**
- Create: `mobile/src/components/ui/z-select.types.ts`, `z-select.ios.tsx`, `z-select.android.tsx`
- Keep: `mobile/src/components/ui/z-select.tsx` (web fallback — the current Modal-based impl)
- Test: `mobile/src/components/ui/z-select.test.tsx` (keep passing against fallback)

- [ ] **Step 1: Confirm the `@expo/ui` Picker (`variant="menu"`) API** on iOS + Android (types + docs). Record exact props (`options`/`label`/`selectedIndex` vs `value`, the onChange signature) in the report.

- [ ] **Step 2: Extract `z-select.types.ts`** from the current `z-select.tsx` public props (`value`, `options: {value,label}[]`, `placeholder`, `onValueChange`, `invalid`, `disabled`, `accessibilityLabel`, `testID`); point the bare `.tsx` at it.

- [ ] **Step 3: Run existing test against fallback** — `pnpm exec jest z-select` → PASS.

- [ ] **Step 4: Implement `z-select.ios.tsx`** — `@expo/ui Picker variant="menu"` inside `<Host>`, mapping `{value,label}[]` to the native option model and translating selected-index ↔ `value` so `onValueChange(value)` is preserved.

- [ ] **Step 5: Implement `z-select.android.tsx`** — same via the Compose exposed-dropdown menu picker.

- [ ] **Step 6: Validate on both dev builds** using `profile.tsx`'s real select(s). Observe: native menu/dropdown opens, current value shown on trigger, checkmark on selected, `onValueChange` fires the correct value, `disabled`/`invalid` honored. Screenshot each.

- [ ] **Step 7: Record + commit**
```
git add mobile/src/components/ui/z-select.types.ts mobile/src/components/ui/z-select.tsx mobile/src/components/ui/z-select.ios.tsx mobile/src/components/ui/z-select.android.tsx
git commit -m "feat(mobile): spike native adaptive ZSelect via @expo/ui Picker(menu)"
```

---

### Task 0.4: Spike the confirm/sheet cluster (`ZConfirmDialog` + `ZDialogPanel` → Alert/formSheet)

**Files:**
- Create: `mobile/src/app/confirm/[action].tsx` (native `formSheet` route for the reason-textarea case)
- Modify: `mobile/src/components/ui/z-confirm-dialog.tsx` (route by `children`: plain → native Alert; with input → push the formSheet route)
- Reference consumer: `mobile/src/app/(tabs)/coaching.tsx` (booking-cancel with reason — must work UNCHANGED)

- [ ] **Step 1: Confirm two APIs** — (a) native alert with a destructive role (`@expo/ui` Alert/ConfirmationDialog vs RN `Alert.alert({style:'destructive'})`), and (b) `react-native-screens` native-stack `formSheet` options on expo-router (`sheetAllowedDetents`, `sheetGrabberVisible`, `sheetCornerRadius`, `sheetLargestUndimmedDetentIndex`, `gestureEnabled`) at https://docs.expo.dev/router/advanced/modals/ + reactnavigation native-stack. Record in the report.

- [ ] **Step 2: Build the `formSheet` confirm route** `mobile/src/app/confirm/[action].tsx`: a route registered with `presentation:'formSheet'`, `sheetAllowedDetents:['0.5','1.0']` (numeric, NOT `fitToContents` — keyboard-heavy, works around rn-screens#3181/#3203), scrim on (`sheetLargestUndimmedDetentIndex:'none'`), grabber visible. Render: title, one-line consequence, optional reason `TextInput` (multiline), Cancel (leading) + red destructive button (trailing). **Never disable the destructive button on an empty reason.** Read params (title/message/reason-config) via `useLocalSearchParams`; return the result via a store or router param callback.

- [ ] **Step 3: Add the route to the root stack** in `mobile/src/app/_layout.tsx`:
```tsx
<Stack.Screen name="confirm/[action]" options={{ presentation: 'formSheet', sheetAllowedDetents: ['0.5','1.0'], sheetGrabberVisible: true, sheetCornerRadius: 16, sheetLargestUndimmedDetentIndex: 'none', gestureEnabled: true, headerShown: false }} />
```
(Pad content to safe-area bottom — rn-screens#3203.)

- [ ] **Step 4: Route `ZConfirmDialog` by `children`** — when `children` is present, navigate to the `formSheet` route (passing title/description/labels/tone) instead of rendering `ZDialogPanel`; when absent, render a native destructive Alert. Keep the public props identical so `asset/[id].tsx` and `coaching.tsx` are untouched.

- [ ] **Step 5: Validate both paths on both dev builds** — plain confirm (delete comment in `asset/[id]`) shows a native alert with a red destructive action; booking-cancel (`coaching.tsx`) opens a native sheet with the reason textarea, keyboard pushes content correctly, swipe-down = Cancel, scrim dims background, empty reason still allows confirm. Screenshot each on each platform.

- [ ] **Step 6: Record + commit**
```
git add mobile/src/app/confirm/[action].tsx mobile/src/app/_layout.tsx mobile/src/components/ui/z-confirm-dialog.tsx
git commit -m "feat(mobile): spike native confirm (Alert) + formSheet reason flow"
```

---

### Task 0.5: Spike `showToast` → burnt (iOS) + `@expo/ui` Snackbar (Android), with fallback decision

**Files:**
- Create: `mobile/src/components/ui/z-toast.ios.tsx`, `z-toast.android.tsx` (host rendering only)
- Modify: `mobile/src/components/ui/z-toast.tsx` (keep the store + `showToast` + the web `ToastCard`/`ZToastHost` as the fallback)
- Test: `mobile/src/components/ui/z-toast.test.tsx` (store contract — must keep passing)

- [ ] **Step 1: Confirm burnt's `Burnt.toast({title,message,preset,haptic})` API and `@expo/ui` Compose `Snackbar` API** (types + READMEs). Record.

- [ ] **Step 2: Keep the store + imperative API unchanged.** In `z-toast.tsx`, leave `toastStore`, `showToast`, `useToasts` exactly as-is (the 11 call sites and the test depend on it). Only the HOST rendering will diverge per platform.

- [ ] **Step 3: Run the store test** — `pnpm exec jest z-toast` → PASS (jest uses the bare fallback host).

- [ ] **Step 4: Implement `z-toast.ios.tsx` host** — subscribe to the store; for each toast call `Burnt.toast({ title, message, preset: tone==='success'?'done':tone==='error'?'error':'none', haptic: tone })`; dismiss per the store. (No JS overlay.)

- [ ] **Step 5: Implement `z-toast.android.tsx` host** — render the `@expo/ui` Compose `Snackbar` driven by the store (bottom, auto-dismiss matching `AUTO_DISMISS_MS`).

- [ ] **Step 6: Validate on both dev builds** — trigger success/error/info toasts (e.g. the enhance-text action in `asset/[id]`). iOS shows the native HUD; Android shows an M3 Snackbar. If burnt fails to build/run, record the failure and switch `z-toast.ios.tsx` to the `react-native-toast-message` fallback (note the decision in the report). Screenshot each.

- [ ] **Step 7: Record the burnt verdict (KEEP or FALLBACK) + commit**
```
git add mobile/src/components/ui/z-toast.tsx mobile/src/components/ui/z-toast.ios.tsx mobile/src/components/ui/z-toast.android.tsx
git commit -m "feat(mobile): spike native toast (burnt iOS / @expo/ui Snackbar Android)"
```

---

### Task 0.6: Convert one full screen end-to-end (`profile`) + dual-platform screenshots

**Files:**
- Modify: `mobile/src/app/(tabs)/profile.tsx`
- Reference: `web/dashboard-next` profile/preferences (for information parity, NOT visual layout)

- [ ] **Step 1: Inventory the screen** — list every primitive `profile.tsx` uses and which now have native variants (ZButton, ZSelect/ZCombobox, ZCheckbox/Toggle, ZAvatar, ZTextInput, ZConfirmDialog, toast). Note gaps (any primitive not yet spiked stays on its fallback for now).

- [ ] **Step 2: Wire the spiked primitives** so the screen renders entirely through the adaptive `z-*` (no raw `@expo/ui` in the screen body). Keep the screen's public behavior/props/data hooks unchanged.

- [ ] **Step 3: Run lint + typecheck + tests**

Run: `wsl.exe -d ubuntu bash -lc "cd ~/dev/projects/zeta/mobile && pnpm run lint && pnpm exec tsc --noEmit && pnpm run test"`
Expected: all green (tests run against fallbacks).

- [ ] **Step 4: Validate the whole screen on both dev builds** — native controls, selects, toggle, confirm/sheet, toast all behave natively; safe-area + header correct; brand accent visible only on interactive elements. Capture iOS + Android screenshots.

- [ ] **Step 5: Commit**
```
git add mobile/src/app/(tabs)/profile.tsx
git commit -m "feat(mobile): spike native profile screen end-to-end"
```

---

### Task 0.7: Write the spike report (gates Phase 2–5 planning)

**Files:**
- Create: `.agents/reports/<YYYYMMDDHHMMSS>_mobile_native_spike_report.md`

- [ ] **Step 1: Record outcomes** — for each spiked primitive: confirmed `@expo/ui` API + import paths; Host sizing/safe-area behavior + any quirks/workarounds; brand-modifier fidelity; `formSheet` keyboard/detent behavior on both platforms; the **burnt verdict (KEEP or FALLBACK to react-native-toast-message)**; the `showToast`/`ZScreen` contracts held; resolved package versions. Include the screenshot file references.

- [ ] **Step 2: List the deltas** that Phase 2–5 planning must absorb (e.g. exact prop names, any primitive that needs a different mapping than the spec assumed).

- [ ] **Step 3: Commit**
```
git add .agents/reports/<ts>_mobile_native_spike_report.md
git commit -m "docs(mobile): native-adaptive spike report (Phase 0 findings)"
```

---

# PHASE 1 — Guardrails first, then foundation

> Guardrails (Tasks 1.1–1.6) land BEFORE the foundation code so the foundation is written under the new doctrine and the lint/CI gates.

### Task 1.1: Rewrite `mobile/AGENTS.md` (web-parity → native-fidelity)

**Files:**
- Modify: `mobile/AGENTS.md`

- [ ] **Step 1: Apply the KEEP/CHANGE/DROP/ADD audit from the spec.** Concretely:
  - **Invert** the "Web-parity is a gate… reject work checked against the plan alone / divergence from the web reference" rule → "Native-fidelity is the gate: HIG (iOS) / Material 3 (Android) + the tier contract. Visual divergence from `web/dashboard-next` is expected and correct; web is the **information/contract** reference only."
  - **Change** "build only from z-* / no raw TextInput/Pressable" → add "**no raw `@expo/ui`, `Pressable`, `Modal`, `lucide-react-native` in `src/app/**`** — only inside `src/components/ui/**`; new primitives are tier-classified." 
  - **Change** colors rule → "role tokens (light+dark) via NativeWind (Custom-RN tier) **or** the `theme/native.ts` modifier adapter (Native tier); never raw hex; never per-component tinting — accent only on interactive/primary, semantic for status, neutral for chrome."
  - **Change** controls: `ZCheckbox` → native Toggle (iOS)/Checkbox (Android); status pill = semantic `ZBadge`.
  - **Drop/replace** the "Headers follow screen type: ZPageHeader + FAB / hero card / header card + stepper" block → native-stack large titles, FAB on Android / nav "+" on iOS, native inset-grouped sections on iOS.
  - **Add** the two-tier model (Native / Custom-RN), the public-API + bare-`.tsx`-fallback invariant, SOTA-as-default, native-first (0-dep native preferred; JS overlays fallback), smoke-test every native path on a real dev build, dual-platform screenshots per PR.
  - **Keep** (unchanged): `ZScreen` root, four states (`isError` before empty), `FlatList`/`SectionList` + real `keyExtractor`, i18n coverage + `sync:i18n` destructiveness caveat, "no web counterpart → named external spec".

- [ ] **Step 2: Verify the file is internally consistent** — no remaining "web is the design source of truth (visual)" or "FAB everywhere" language. Read it top to bottom.

- [ ] **Step 3: Commit**
```
git add mobile/AGENTS.md
git commit -m "docs(mobile): re-ground AGENTS.md from web-parity to native-fidelity doctrine"
```

---

### Task 1.2: Update the `mobile-dev` agent

**Files:**
- Modify: `.claude/agents/mobile-dev.md`

- [ ] **Step 1: Edit the conflicting lines:**
  - Line ~19: "`web/dashboard-next` is the design source of truth — mirror its hierarchy" → "`web/dashboard-next` is the **information/contract** reference; iOS=HIG, Android=Material are the **visual** references."
  - Line ~24: replace `lucide-react-native` mention with `expo-symbols` (SF/Material Symbols) for native; lucide only in the web fallback.
  - Line ~30: extend the primitives rule → "**no raw `@expo/ui`/`Pressable`/`Modal` in screens**; z-* have platform internals (`.ios/.android/.types` + bare web fallback); new primitives tier-classified; `ZCheckbox` → native Toggle/Checkbox."
  - Line ~36: colors → role tokens via NativeWind or the `theme/native.ts` adapter; no per-component tinting.
- [ ] **Step 2: Add** a short "Native-adaptive contract" block: two tiers, public-API invariant, SOTA-as-default, dev-build dual-platform screenshots, smoke-test native paths.
- [ ] **Step 3: Commit** — `git add .claude/agents/mobile-dev.md && git commit -m "docs(agents): update mobile-dev for native-adaptive doctrine"`

---

### Task 1.3: Update the `mobile-reviewer` agent (Claude)

**Files:**
- Modify: `.claude/agents/mobile-reviewer.md`

- [ ] **Step 1: Rewrite line ~15 "The mandate that matters most"** — it currently makes web the design source of truth and says to **reject work validated against the plan/spec alone**; this would reject the entire redesign. Replace with: "For every changed screen, verify **native fidelity** (HIG on iOS / Material 3 on Android) and the **tier contract** (Native vs Custom-RN, correct mapping). Web is the **information/contract** reference — check information/terminology parity, NOT visual layout. Visual divergence from web is expected."
- [ ] **Step 2: Update the checklist** — primitives: flag raw `@expo/ui`/`Pressable`/`Modal`/`lucide` in `src/app/**`; colors: role tokens / adapter / no hex / no per-component tint; add checks for: public-API stability (screens unchanged), bare `.tsx` fallback present + complete, dual-platform screenshots in the PR, native-fidelity per HIG/Material. Keep the still-valid checks (four states, feedback, lists, i18n, native-module safety, tests-not-under-`src/app`).
- [ ] **Step 3: Commit** — `git add .claude/agents/mobile-reviewer.md && git commit -m "docs(agents): re-ground mobile-reviewer on native-fidelity (was web-parity)"`

---

### Task 1.4: Update the `mobile-reviewer` agent (Codex)

**Files:**
- Modify: `.codex/agents/mobile-reviewer.toml`

- [ ] **Step 1: Read the current TOML** and mirror the exact same doctrine changes from Task 1.3 into its prompt/checklist fields, preserving the TOML structure.
- [ ] **Step 2: Verify it parses** — `wsl.exe -d ubuntu bash -lc "cd ~/dev/projects/zeta && python3 -c \"import tomllib,sys; tomllib.load(open('.codex/agents/mobile-reviewer.toml','rb'))\""` → no error.
- [ ] **Step 3: Commit** — `git add .codex/agents/mobile-reviewer.toml && git commit -m "docs(agents): mirror native-fidelity review doctrine to Codex mobile-reviewer"`

---

### Task 1.5: ESLint guardrails (restricted-imports + no-hex)

**Files:**
- Modify: `mobile/eslint.config.js`
- Test: `mobile/src/__tests__/eslint-guardrails.test.ts` (lints fixtures)

- [ ] **Step 1: Write the failing fixture test**

Create `mobile/src/__tests__/eslint-guardrails.test.ts` that runs ESLint programmatically on two in-string fixtures and asserts violations:
```ts
import { ESLint } from 'eslint';
test('bans @expo/ui import in a screen', async () => {
  const eslint = new ESLint({ cwd: process.cwd() });
  const [res] = await eslint.lintText("import { Button } from '@expo/ui/swift-ui';\n", { filePath: 'src/app/foo.tsx' });
  expect(res.messages.some((m) => m.ruleId === 'no-restricted-imports')).toBe(true);
});
test('allows @expo/ui import inside components/ui', async () => {
  const eslint = new ESLint({ cwd: process.cwd() });
  const [res] = await eslint.lintText("import { Button } from '@expo/ui/swift-ui';\n", { filePath: 'src/components/ui/z-button.ios.tsx' });
  expect(res.messages.some((m) => m.ruleId === 'no-restricted-imports')).toBe(false);
});
```

- [ ] **Step 2: Run it — expect FAIL**

Run: `wsl.exe -d ubuntu bash -lc "cd ~/dev/projects/zeta/mobile && pnpm exec jest eslint-guardrails"`
Expected: FAIL (no rule yet).

- [ ] **Step 3: Add the rules to `eslint.config.js`**

Add a config block scoped to `src/app/**` that forbids the native/primitive imports, plus a repo-wide no-hex rule (exempt the sanctioned dark call/video surface):
```js
{
  files: ['src/app/**/*.{ts,tsx}'],
  rules: {
    'no-restricted-imports': ['error', { paths: [
      { name: 'lucide-react-native', message: 'Use z-symbol (expo-symbols) — icons live in components/ui.' },
    ], patterns: [
      { group: ['@expo/ui', '@expo/ui/*'], message: 'No raw @expo/ui in screens — go through a z-* primitive.' },
    ] }],
    'no-restricted-syntax': ['error',
      { selector: "ImportSpecifier[imported.name='Pressable']", message: 'No raw Pressable in screens — use Touchable / a z-* primitive.' },
      { selector: "ImportSpecifier[imported.name='Modal']", message: 'No raw Modal in screens — use the formSheet route / ZDialogPanel.' },
    ],
  },
},
{
  files: ['src/**/*.{ts,tsx}'],
  ignores: ['src/app/call/**', 'src/components/ui/z-screen.tsx'],
  rules: {
    'no-restricted-syntax': ['warn',
      { selector: "Literal[value=/^#(?:[0-9a-fA-F]{3,8})$/]", message: 'No raw hex — use role tokens (theme/roles.ts) or NativeWind z-* classes.' },
    ],
  },
},
```
(Confirm the flat-config merge order doesn't clobber the earlier `no-restricted-syntax`; combine selectors into one rule per file-group if needed.)

- [ ] **Step 4: Run the test — expect PASS**, then run the full lint to see existing violations:
`pnpm exec jest eslint-guardrails` → PASS; `pnpm run lint` → record any pre-existing raw-hex/Pressable hits (these become Phase-2 cleanup, the hex rule is `warn` to avoid blocking now).

- [ ] **Step 5: Commit** — `git add mobile/eslint.config.js mobile/src/__tests__/eslint-guardrails.test.ts && git commit -m "feat(mobile): ESLint guardrails — no raw @expo/ui/Pressable/Modal/lucide in screens, no-hex"`

---

### Task 1.6: Token-sync CI check

**Files:**
- Create: `mobile/scripts/check-tokens-synced.mjs`
- Modify: `Makefile` (add a `mobile:check-tokens` target) and the mobile lint/test CI step

- [ ] **Step 1: Write the check script** that runs the (extended) `sync-tokens.mjs` to a temp/in-memory output and fails if the committed generated files differ:
```js
// check-tokens-synced.mjs — runs sync logic, diffs against committed files, exits 1 on drift.
import { execSync } from 'node:child_process';
execSync('node scripts/sync-tokens.mjs', { stdio: 'inherit' });
const dirty = execSync('git status --porcelain global.css src/theme/roles.ts src/theme/colors.ts tailwind.config.js').toString().trim();
if (dirty) { console.error('Token files out of sync — run `pnpm run sync:tokens` and commit:\n' + dirty); process.exit(1); }
console.log('tokens in sync');
```

- [ ] **Step 2: Add Makefile target** `mobile:check-tokens` invoking it via the WSL pattern, and add it to the mobile CI gate alongside lint/typecheck/test.

- [ ] **Step 3: Verify** — `wsl.exe -d ubuntu bash -lc "cd ~/dev/projects/zeta/mobile && node scripts/check-tokens-synced.mjs"` → "tokens in sync" (exit 0) on a clean tree.

- [ ] **Step 4: Commit** — `git add mobile/scripts/check-tokens-synced.mjs Makefile && git commit -m "ci(mobile): fail when generated design tokens drift from source"`

---

### Task 1.7: Role-token re-architecture (`theme/roles.ts` + extend `sync-tokens.mjs`)

**Files:**
- Create: `mobile/src/theme/roles.ts` (generated)
- Modify: `mobile/scripts/sync-tokens.mjs`, `mobile/global.css`, `mobile/tailwind.config.js`
- Test: `mobile/src/__tests__/theme-roles.test.ts`

- [ ] **Step 1: Write the failing test** asserting the role contract + light/dark parity:
```ts
import { roles } from '../theme/roles';
const REQUIRED = ['accent','onAccent','accentContainer','success','warning','danger','background','surface','surfaceVariant','onSurface','onSurfaceVariant','outline'] as const;
test('every role exists in light and dark', () => {
  for (const r of REQUIRED) {
    expect(roles.light[r]).toMatch(/^#/);
    expect(roles.dark[r]).toMatch(/^#/);
  }
});
```

- [ ] **Step 2: Run — expect FAIL** (`roles.ts` missing). `pnpm exec jest theme-roles` → FAIL.

- [ ] **Step 3: Extend `sync-tokens.mjs`** to map the flat web `--z-*` hues into the semantic role set for `light` and a derived `dark` set, and emit `src/theme/roles.ts` (`export const roles = { light: {...}, dark: {...} } as const;`) IN ADDITION to the existing `global.css`/`colors.ts` outputs. Keep `colors.ts` for legacy raw-value call sites during migration. Document the light→dark derivation rules in the script.

- [ ] **Step 4: Run sync, then the test — expect PASS**: `pnpm run sync:tokens && pnpm exec jest theme-roles` → PASS.

- [ ] **Step 5: Wire NativeWind** — in `global.css` add a `dark`/`prefers-color-scheme` (or NativeWind `dark:`) variant block from `roles.dark`, and in `tailwind.config.js` add the role color names so `bg-surface`/`text-onSurface`/etc. resolve. Confirm `pnpm exec tsc --noEmit` + a Storybook render still work.

- [ ] **Step 6: Commit** — `git add mobile/src/theme/roles.ts mobile/scripts/sync-tokens.mjs mobile/global.css mobile/tailwind.config.js mobile/src/__tests__/theme-roles.test.ts && git commit -m "feat(mobile): semantic role tokens (light+dark) generated from web tokens"`

---

### Task 1.8: `theme/native.ts` token→modifier adapter

**Files:**
- Create: `mobile/src/theme/native.ts`
- Test: `mobile/src/__tests__/theme-native.test.ts`

- [ ] **Step 1: Write the failing test** for the adapter contract (it maps a role + color scheme to the modifier inputs the native variants consume):
```ts
import { accentColor, roleColor } from '../theme/native';
test('accentColor returns the brand orange in light', () => {
  expect(accentColor('light')).toBe('#ea580c');
});
test('roleColor resolves a surface role per scheme', () => {
  expect(roleColor('surface','dark')).toMatch(/^#/);
});
```

- [ ] **Step 2: Run — expect FAIL.** `pnpm exec jest theme-native` → FAIL.

- [ ] **Step 3: Implement `native.ts`** reading from `roles` (same source as NativeWind): export helpers that return the resolved hex / modifier inputs for `@expo/ui` SwiftUI (`tint`/`foregroundColor`/`background`) and Compose (Material color args), keyed by role + `useColorScheme()`. This is the single place the `.ios/.android` primitives read brand/semantic colors — never hardcoded hex (replaces the spike's hardcoded `#ea580c`).

- [ ] **Step 4: Run — expect PASS.** `pnpm exec jest theme-native` → PASS.

- [ ] **Step 5: Refactor the Phase-0 spike primitives** (`z-button.ios/android`, `z-select.ios/android`, toast hosts) to read colors from `theme/native.ts` instead of the hardcoded hex. Re-run lint/typecheck.

- [ ] **Step 6: Commit** — `git add mobile/src/theme/native.ts mobile/src/__tests__/theme-native.test.ts mobile/src/components/ui/z-button.ios.tsx mobile/src/components/ui/z-button.android.tsx mobile/src/components/ui/z-select.ios.tsx mobile/src/components/ui/z-select.android.tsx mobile/src/components/ui/z-toast.ios.tsx mobile/src/components/ui/z-toast.android.tsx && git commit -m "feat(mobile): theme/native.ts token→modifier adapter; spike primitives read role tokens"`

---

### Task 1.9: Shared `Touchable` + haptics

**Files:**
- Create: `mobile/src/components/ui/touchable.tsx`
- Test: `mobile/src/components/ui/touchable.test.tsx`

- [ ] **Step 1: Write the failing test** — `Touchable` fires `onPress`, respects `disabled`, exposes `accessibilityRole='button'`:
```tsx
import { render, fireEvent } from '@testing-library/react-native';
import { Touchable } from './touchable';
import { Text } from 'react-native';
test('fires onPress when enabled', async () => {
  const onPress = jest.fn();
  const { getByText } = await render(<Touchable onPress={onPress}><Text>Tap</Text></Touchable>);
  fireEvent.press(getByText('Tap'));
  expect(onPress).toHaveBeenCalledTimes(1);
});
test('does not fire when disabled', async () => {
  const onPress = jest.fn();
  const { getByText } = await render(<Touchable onPress={onPress} disabled><Text>Tap</Text></Touchable>);
  fireEvent.press(getByText('Tap'));
  expect(onPress).not.toHaveBeenCalled();
});
```

- [ ] **Step 2: Run — expect FAIL.** `pnpm exec jest touchable` → FAIL.

- [ ] **Step 3: Implement `touchable.tsx`** — one `Pressable` wrapper: `android_ripple` on Android, `{pressed}` opacity on iOS, centralized `expo-haptics` (light impact on press, configurable/off), `disabled`/`loading`, `accessibilityRole='button'`. (This is the sanctioned home for raw `Pressable`; screens use `Touchable` or z-*.)

- [ ] **Step 4: Run — expect PASS.** `pnpm exec jest touchable` → PASS.

- [ ] **Step 5: Commit** — `git add mobile/src/components/ui/touchable.tsx mobile/src/components/ui/touchable.test.tsx && git commit -m "feat(mobile): shared Touchable with platform press feedback + haptics"`

---

### Task 1.10: `z-symbol` (expo-symbols) wrapper for chrome icons

**Files:**
- Create: `mobile/src/components/ui/z-symbol.tsx`
- Test: `mobile/src/components/ui/z-symbol.test.tsx`

- [ ] **Step 1: Confirm the `expo-symbols` `SymbolView` API** (SF Symbols iOS / Material Symbols Android) + how to provide a per-platform symbol name. Record any Android coverage gaps.

- [ ] **Step 2: Write the failing test** — `ZSymbol` renders with an accessibility label and a name prop:
```tsx
import { render } from '@testing-library/react-native';
import { ZSymbol } from './z-symbol';
test('renders with accessibility label', async () => {
  const { getByLabelText } = await render(<ZSymbol name="house" label="Home" />);
  expect(getByLabelText('Home')).toBeTruthy();
});
```

- [ ] **Step 3: Run — expect FAIL.** `pnpm exec jest z-symbol` → FAIL.

- [ ] **Step 4: Implement `z-symbol.tsx`** mapping a single `name` to the platform symbol (a small name map for the chrome icons used by tabs/headers), color from `theme/native.ts`, size, accessibility label. Bare `.tsx` fallback may render the lucide equivalent for web/Storybook.

- [ ] **Step 5: Run — expect PASS.** `pnpm exec jest z-symbol` → PASS.

- [ ] **Step 6: Commit** — `git add mobile/src/components/ui/z-symbol.tsx mobile/src/components/ui/z-symbol.test.tsx && git commit -m "feat(mobile): ZSymbol wrapper over expo-symbols (SF/Material) for chrome icons"`

---

### Task 1.11: Tier manifest + primitive-contract test

**Files:**
- Create: `mobile/src/components/ui/tiers.ts`, `mobile/src/__tests__/primitive-contract.test.ts`

- [ ] **Step 1: Write the manifest** `tiers.ts` — a record mapping every `z-*` primitive (and composites) to its tier (`'native' | 'custom-canvas' | 'custom-no-native' | 'infra'`), from the spec's classification:
```ts
export const TIERS = {
  'z-button': 'native', 'z-icon-button': 'native', 'z-select': 'native', 'z-text-input': 'native',
  'z-textarea': 'native', 'z-checkbox': 'native', 'z-tabs': 'native', 'z-card': 'native',
  'z-badge': 'native', 'z-chip': 'native', 'z-dialog-panel': 'native', 'z-confirm-dialog': 'native',
  'z-toast': 'native', 'z-empty-state': 'native', 'z-query-error': 'native', 'z-combobox': 'native',
  'z-stepper': 'custom-no-native', 'z-icon-tile': 'custom-no-native', 'z-skeleton': 'custom-no-native',
  'z-video-preview': 'custom-no-native', 'z-avatar': 'custom-no-native', 'z-avatar-input': 'custom-no-native',
  'z-screen': 'infra', 'z-keyboard-avoiding-view': 'infra', 'z-field-label': 'infra', 'z-field-error': 'infra',
  'z-page-header': 'native', 'z-back-header': 'native', 'z-danger-zone-card': 'native',
} as const;
```

- [ ] **Step 2: Write the failing contract test** asserting every `*.tsx` primitive in `components/ui/` (excluding `.test`/`.stories`/`.ios`/`.android`/`.types`) has a tier and a bare `.tsx`:
```ts
import { TIERS } from '../components/ui/tiers';
import { readdirSync } from 'node:fs';
test('every ui primitive is tier-classified and has a bare .tsx fallback', () => {
  const files = readdirSync('src/components/ui')
    .filter((f) => f.endsWith('.tsx') && !/\.(test|stories|ios|android)\.tsx$/.test(f))
    .map((f) => f.replace(/\.tsx$/, ''));
  for (const name of files) expect(TIERS).toHaveProperty(name);
});
```

- [ ] **Step 3: Run — expect FAIL** (until names align), then reconcile any naming mismatch. `pnpm exec jest primitive-contract` → PASS.

- [ ] **Step 4: Commit** — `git add mobile/src/components/ui/tiers.ts mobile/src/__tests__/primitive-contract.test.ts && git commit -m "feat(mobile): tier manifest + primitive-contract test (tier + bare fallback)"`

---

### Task 1.12: Phase-1 green gate + foundation report

**Files:**
- Create: `.agents/reports/<YYYYMMDDHHMMSS>_mobile_native_phase1_completion.md`

- [ ] **Step 1: Full green gate**

Run: `wsl.exe -d ubuntu bash -lc "cd ~/dev/projects/zeta/mobile && pnpm run lint && pnpm exec tsc --noEmit && pnpm run test && node scripts/check-tokens-synced.mjs"`
Expected: all pass; record any intentionally-deferred `warn`-level hex hits as Phase-2 cleanup.

- [ ] **Step 2: Write the completion report** — context, what changed (guardrails + foundation), files touched, verification output, and the explicit follow-ups for Phase 2 (use `theme/native.ts` everywhere; migrate remaining controls; the burnt KEEP/FALLBACK decision from Task 0.7).

- [ ] **Step 3: Commit** — `git add .agents/reports/<ts>_mobile_native_phase1_completion.md && git commit -m "docs(mobile): Phase 1 foundation completion report"`

---

## Self-Review (author checklist)

**Spec coverage (Phase 0+1 only):** spike of ZButton/ZSelect/confirm-sheet/toast + one full screen (0.2–0.6) ✓; spike report gating Phase 2–5 (0.7) ✓; AGENTS.md rewrite (1.1) ✓; both agents Claude+Codex (1.2–1.4) ✓; ESLint restricted-imports + no-hex (1.5) ✓; token-sync CI (1.6) ✓; role tokens light+dark + sync-tokens extension (1.7) ✓; token→modifier adapter (1.8) ✓; Touchable+haptics (1.9) ✓; expo-symbols chrome wrapper (1.10) ✓; tier classification recorded (1.11) ✓; expo-haptics + burnt install + dev-client rebuild + patch pin (0.1) ✓. Phases 2–5 intentionally excluded.

**Placeholder scan:** Phase-0 tasks legitimately defer exact `@expo/ui` prop names to a "confirm against types/docs" first step (correct for a spike); all config/token/adapter/Touchable tasks have concrete code. No TBD/TODO.

**Type consistency:** `ZButtonProps`/`z-button.types.ts` shared across all three button files; `roles` consumed by both `theme/native.ts` (1.8) and NativeWind wiring (1.7) from one generated source; `TIERS` keys (1.11) match the `z-*` filenames; `theme/native.ts` replaces the spike's hardcoded `#ea580c` (1.8 Step 5).

---

## Execution Handoff

Choose how to execute (see end of message).
