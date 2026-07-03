# Mobile: Platform-Adaptive Native UI — Design Spec

- **Date:** 2026-06-14
- **Branch:** `feat/mobile-token-auth` (mobile single-PR track, #15 — no intermediate merges to `main`)
- **Status:** Design approved (brainstorming); precursor to the implementation plan.
- **Supersedes the visual doctrine of:** `mobile/AGENTS.md` "web-parity" rules (see Governance).

## Context

The mobile app (`mobile/`, Expo SDK 56 / RN 0.85.3 / React 19.2 / New Arch) currently renders a **1:1 visual port of the web dashboard**: hand-built `z-*` primitives styled with NativeWind classes from the web warm-orange/cream tokens. It does **not** look native on either platform — by design, the doctrine in `mobile/AGENTS.md` made `web/dashboard-next` the *visual* source of truth.

**This was the wrong path.** The goal is now a **platform-adaptive native look**: iOS reads as HIG/Cupertino, Android as Material 3 — while keeping the Zeta brand identity. Visual parity (pixel-identical iOS = Android = web) is intentionally abandoned; **parity moves from visual to contract** (same components, props, screens, data, i18n).

Key enabling finding: **`@expo/ui` is stable in SDK 56** (was alpha through SDK 53), already installed (`~56.0.17`) but used nowhere. It renders real SwiftUI on iOS and Jetpack Compose / Material 3 on Android from one import, and already ships native counterparts for ~22 of ~29 primitives. Also installed-but-unused: `expo-glass-effect`, `expo-symbols`. Not installed: `expo-haptics`. Cross-platform UI kits (Tamagui, react-native-paper, gluestack) do **not** produce platform-adaptive Cupertino-on-iOS/Material-on-Android — they render one custom look — so the path is native-component-backed, not "pick a theme library".

## Decision

Adopt **Approach C — the tiered hybrid**, applied per *surface*, not per app:

- **Native engine where it counts:** navigation, controls, inputs, overlays, lists, cards become real OS components via `@expo/ui` + native navigation.
- **Brand as a single accent:** orange is one interactive accent (iOS `tintColor`/`DynamicColorIOS`, Android M3 `primary`), never tinting chrome backgrounds.
- **Custom only where it's brand-led or has no native equivalent.**

Governing rule for all UX/technical choices: **SOTA-as-default** — apply the platform's own guidance (HIG / Material 3) and prefer the native presentation primitive over hand-rolled RN. Only genuine *brand/product* decisions are escalated to the user.

### Brand/product decisions (made)
1. **Chrome = pure system; cream only on Tier-3 canvas.** The warm cream (`#fff8ed`/`surfaceWarm`) largely disappears from chrome; brand lives in accent + logo + canvas.
2. **Fixed brand seed (orange), not Material You dynamic color** on Android — brand consistency over wallpaper-derived color.
3. **Light + dark tokens from the start** (`app.json` already declares `userInterfaceStyle: "automatic"`; native flips automatically, so custom tokens must too). Design light-first.
4. **Pixel parity between iOS and Android is intentionally dropped**; dual-platform dev-build screenshots replace 1:1 web parity in review.

## Architecture — two build tiers + an accent rule

### The contract: one public API, platform internals
Every `z-*` primitive keeps **identical props**; the ~17 screens are not rewritten. Only internals branch per platform via Metro file resolution:

```
components/ui/
  z-button.types.ts     # shared props/types — single source
  z-button.tsx          # web/Storybook/jest fallback (current NativeWind impl, MUST stay complete & working)
  z-button.ios.tsx      # SwiftUI via @expo/ui, inside <Host>
  z-button.android.tsx  # Jetpack Compose via @expo/ui, inside <Host>
```

Invariants:
1. The bare `z-*.tsx` stays a **complete, working web variant** (react-native-web-vite Storybook + web build render it; `@expo/ui` is native-only).
2. Native subtrees live inside `<Host>`; safe-area/Host sizing handled deliberately.
3. `showToast` store contract and `ZScreen` safe-area contract are preserved unchanged.

### Two implementation tiers (the only ones that affect file structure)
- **Native** — `@expo/ui` + native navigation, for every primitive that has an OS widget.
- **Custom RN (NativeWind)** — two reasons: **(a) brand-led canvas** (deliberately custom) and **(b) no native equivalent** (neutral custom, token-styled).
- **Infra/plumbing** — `ZScreen`, `ZKeyboardAvoidingView`, `ZFieldLabel`/`ZFieldError` (fold into native TextField label/supportingText where applicable).

### The accent rule (a cross-cutting rule, not a tier)
Color on the native tier comes from one of three sources, all set globally — never per component:
| Source | For | Examples |
| --- | --- | --- |
| **Brand accent (orange)** | primary & interactive | primary button, FAB (Android)/nav "+" (iOS), active tab, selected chip/segment, switch-on |
| **Semantic (green/amber/red)** | status & feedback | status `ZBadge`, `danger` button, validation, success/error toast |
| **System-neutral** | everything else | Android icon buttons, body text, surfaces, chrome backgrounds |

## Tier classification (full inventory)

**Native (OS widget; accent applied only per the rule above):**
- Inputs: `ZTextInput`/`ZTextarea` → TextField · `ZSelect` → Picker(menu)/ExposedDropdownMenu · `ZCheckbox` → Toggle (iOS)/Checkbox (Android) · `ZTabs` (in-page) → Segmented
- Containers: `ZCard` + `asset-card` + `ZDangerZoneCard` → Section (iOS, inset-grouped)/Card (Android) — *layout-philosophy shift on iOS*
- Overlays: `ZDialogPanel` → BottomSheet/formSheet · `ZConfirmDialog` → Alert / formSheet (see Hard cases) · `ZToast` → Snackbar (Android)
- States: `ZEmptyState`/`ZQueryError` → `ContentUnavailableView` (iOS), styled column (Android)
- Buttons/markers: `ZButton`, `ZIconButton`+FAB, `ZBadge` (semantic; native Badge Android / styled capsule iOS), `ZChip`
- Navigation: `ZPageHeader`/`ZBackHeader` → native-stack headers · bottom tabs → NativeTabs

**Custom RN — (a) brand-led canvas:** `login`/auth (logo/wordmark + native button), per-instance marquee empty states. *(The coaching-review screen `asset/[id]` is NOT canvas — it is a native composition of cards/lists/dialogs + native video + the behavioral composites `ReviewItem`/`ReviewComposer`.)*

**Custom RN — (b) no native equivalent (neutral, token-styled):** `ZStepper`, `ZIconTile`, `ZSkeleton`, `ZVideoPreview`, `ZAvatar`/`ZAvatarInput`. All must still use native iconography (SF/Material Symbols), system fonts, and role tokens. Open idiom questions: `ZStepper` (consider native page-control/linear-progress + per-step navigation) and `ZIconTile` (colored tiles are a web-ism; native list rows often use plain leading symbols).

**Platform-split within one primitive:** `ZToast` (Android native Snackbar / iOS native HUD — see Hard cases), `ZEmptyState` (native iOS / styled Android).

**Pre-existing debt to fix during migration:** `login` uses hardcoded English literals (no `auth.login.*` i18n keys) and the logo image asset is missing.

## Theme / token re-architecture

Today's tokens are flat/visual (`primary`, `surfaceWarm`, `primarySoft`), single-mode (light only), and feed two "paint this hex" consumers (CSS vars via `tailwind.config.js`; raw values via `src/theme/colors.ts`) — generated by `scripts/sync-tokens.mjs` from the web `styles.scss`. `@expo/ui` can read **neither**; it needs **modifiers**.

**A — flat hues → semantic role tokens** (the three accent-rule sources, formalized), mapping cleanly to both platforms:
| Role group | iOS semantic | Android Material 3 |
| --- | --- | --- |
| `accent`/`onAccent`/`accentContainer` (orange, interactive only) | `tintColor`/`DynamicColorIOS` | `primary`/`onPrimary`/`primaryContainer` |
| `success`·`warning`·`danger` (+`on`/`container`) | system semantic + custom | `error` + custom roles |
| `background`·`surface`·`surfaceVariant`·`onSurface`·`onSurfaceVariant`·`outline` | `systemGroupedBackground`·`label`·`secondaryLabel`·`separator` | `surface`·`onSurface`·`outline` |

**B — three resolution layers from one source:** shared brand seed (origin: web tokens) → mode (light **+ dark**) → platform (iOS-semantic vs M3 roles; plus `Platform.select`'d typography/spacing/radii/elevation). Fonts already system (SF Pro/Roboto) — only type scale/weights per platform, no font switch.

**C — two consumers, one source (no drift):**
- NativeWind path (Custom-RN tier + web/Storybook) via CSS vars/Tailwind (+ `dark:`).
- **`theme/native.ts` token→modifier adapter** (Native tier): maps roles → SwiftUI/Compose modifiers. The new architectural keystone.
- Both read the same `theme/roles.ts`. **`scripts/sync-tokens.mjs` is extended** to emit the role set (light+dark) for both paths.

## Navigation & foundation

- **Bottom tabs → expo-router `NativeTabs`** (real UITabBar / M3 bottom nav). Accent via `tintColor` + `DynamicColorIOS`. Icons lucide → SF/Material Symbols. Permission-gating preserved (verify against NativeTabs API). ⚠️ 5 tabs (`index/videos/coaching/groups/profile`) sit exactly at the Android 5-tab cap — no room for a 6th (IA fixed at 5).
- **Native-stack headers:** list/index → `headerLargeTitle` (retire `ZPageHeader`, used in 4 tabs); detail/form → native header + swipe-back + `headerBackButtonDisplayMode:'minimal'` (retire `ZBackHeader`, used in 5 screens); modal routes (`upload`, `book`) → native formSheet/modal; `call/[bookingId]` stays fullScreenModal.
- **FAB split:** Android Material FAB / iOS nav-bar "+" (header-right). Replaces the "FAB everywhere" rule. FABs today: `videos`/`coaching`/`groups`.
- **`ZScreen` inset rework (contract unchanged):** top inset now from native header; ⚠️ NativeTabs can't report its height → manual bottom padding breaks → use native `contentInsetAdjustmentBehavior`.
- **Foundation:** shared `Touchable` (Pressable: `android_ripple`/iOS opacity, centralized `expo-haptics`, disabled/loading) for Custom-RN + composites; `expo-symbols` (chrome first, then in-content); type scale per platform; **dark tokens required now** (`automatic` already declared).
- **Liquid Glass (iOS 26):** `expo-glass-effect` on header/sheet/FAB chrome in `.ios.tsx`, always `isLiquidGlassAvailable()`-gated with plain fallback; Android uses Material elevation. No layout may depend on glass.

## Hard cases (Modal cluster) — SOTA-verified

| Component | iOS | Android | Resolution |
| --- | --- | --- | --- |
| `ZSelect` (short ≤~12) | Picker(menu) | ExposedDropdownMenu | `@expo/ui Picker variant="menu"` (avoid `wheel` for arbitrary sets) |
| `ZSelect`/`ZCombobox` (long/searchable, e.g. timezone) | pushed `.searchable` list | M3 SearchBar + list | **hand-built picker screen** (route `/select/[field]`, FlatList + search) — no `@expo/ui` primitive has search; never a third-party JS dropdown. `ZCombobox` has 1 consumer → lowest priority |
| `ZDialogPanel` | UISheetPresentationController | M3 modal bottom sheet | **native-stack `presentation:'formSheet'`** (react-native-screens 4.25.2, **zero new dep**) — default sheet primitive; `@gorhom/bottom-sheet` only for inline/scroll-coupled (verify vs Reanimated 4 first) |
| `ZConfirmDialog` | Alert / formSheet | AlertDialog / bottom sheet | **route by `children`**: plain confirm → native Alert; confirm **with input** (the booking-cancel "reason" textarea) → **native formSheet** (alerts can't host a multi-line textarea). API unchanged → `coaching.tsx` untouched |
| `ZToast` | native HUD (`burnt`) | native M3 Snackbar (`@expo/ui`) | **hybrid by `Platform.OS`** behind the unchanged imperative `showToast` (store + 11 call sites untouched) |

**SOTA details for the formSheet confirm-with-input:** scrim ON (`sheetLargestUndimmedDetentIndex:'none'`), red destructive button trailing / Cancel leading, **never disable confirm on empty reason** (input optional), gate high-severity deletes behind a typed confirmation token. Use **numeric detents `[0.5,1.0]`** (not `fitToContents`) because the sheet is keyboard-heavy — works around SDK-56 quirks: `fitToContents`+header growth (expo/expo#42066), Android keyboard doesn't resize `fitToContents` (rn-screens#3181), transparent bottom inset with `headerShown:false` (rn-screens#3203). **Verify on real hardware**, not just simulator.

**`burnt` caveat:** v0.13.0, last published 2025-03, permissive peers but **unverified on RN 0.85/React 19.2** → smoke-test on a dev build in Phase 0; if it fails, fall back to `react-native-toast-message` (pure-JS). Android side uses `@expo/ui` Compose Snackbar (in 56.0.9+) for true M3, not burnt's plain ToastAndroid.

**Overall SOTA principle (goes into AGENTS.md):** one adaptive primitive per pattern that resolves to the OS-native control at runtime; choose the container by what it holds (alert confirms, sheet captures input, snackbar/HUD gives transient feedback, menu picks from short fixed sets, search screen picks from long lists); prefer zero-new-dependency native primitives (`formSheet`, `@expo/ui`); treat third-party JS overlays as fallback; smoke-test every native path on a real dev build.

## Drift prevention & governance

Drift is prevented at four levels; **mechanical guards (lint/CI) > agent review > docs**, because lint does not depend on memory. **Guardrails are built first (Phase 0/1), before the bulk migration.**

1. **Architecture drift** (raw `@expo/ui`/`Pressable`/`Modal`/`lucide` in a screen; un-tiered primitive) → **ESLint `no-restricted-imports`** forbidding those outside `src/components/ui/**` (`mobile/eslint.config.js` has no such rule today). Public-API invariant; each primitive declares its tier.
2. **Token drift** (hardcoded hex; NativeWind classes vs native modifiers diverge) → one generated `theme/roles.ts` → both consumers; no-raw-hex enforced as **lint** (currently only a doc rule); CI check that `sync:tokens` produces no diff.
3. **Fallback drift** (bare `.tsx`/Storybook rots; a primitive misses a platform file) → "every primitive keeps a complete bare `.tsx`" invariant; web-export + Storybook build in CI; typecheck across `.ios/.android/.types`; a test importing every `ui/` primitive + asserting a tier.
4. **Doctrine drift (largest risk)** → rewrite the rules **and** the agents (below).

### `mobile/AGENTS.md` best-practices audit
The "Parity-hardening rules" block codifies the very web-parity doctrine being reversed; it must be re-grounded from "web-parity" to "native-fidelity", not patched superficially.

- **KEEP:** `ZScreen` root; four states (`isError` before empty); `FlatList`/`SectionList` + real `keyExtractor`; i18n covers everything (+ `sync:i18n` destructiveness caveat); "no web counterpart → follow a named external spec (HIG/Material)" (now central); UI changes need a screenshot (**strengthen to both platforms**).
- **CHANGE:** "web is the design reference for hierarchy/spacing" → *web = information/contract reference; HIG/Material = visual reference*. "z-* only / no raw TextInput/Pressable" → **+ no raw `@expo/ui` in screens**, z-* have platform internals, new primitives tier-classified. "colors via z-*/colors.ts" → role tokens (light+dark) via NativeWind (Custom-RN) **or** the modifier adapter (Native tier), no per-component tinting. "Pressable only as wrapper / status pill = ZBadge / ZCheckbox not Switch" → native controls (ZCheckbox → native Toggle/Checkbox). "Keyboard: ZKeyboardAvoidingView + persistTaps" → native sheets/TextField handle keyboard; the KAV hack goes away there.
- **DROP/INVERT:** "Web-parity is a gate… reject work checked against the plan alone / divergence from the web reference" → **invert** to "native-fidelity is the gate (HIG/Material + tier contract); visual divergence from web is expected and correct." "Headers follow screen type: ZPageHeader + FAB / detail hero card / form header card + stepper" → native-stack large titles / FAB split / native inset-grouped sections.
- **ADD:** tier contract + public-API invariant; one-token-source/two-consumers; native-first (0-dep native preferred, JS overlays fallback); smoke-test every native path on a real dev build; bare `.tsx` stays a complete web fallback; dual-platform screenshots per PR; SOTA-as-default.

### Agent definitions to update (both ecosystems)
- `.claude/agents/mobile-dev.md` — lines 19 (web-source-of-truth), 24/36 (lucide, colors), 30 (z-*/Pressable/Switch); add tier/native-first/SOTA/dual-platform rules.
- `.claude/agents/mobile-reviewer.md` — **line 15 "the mandate that matters most" would reject the native redesign** → rewrite to native-fidelity; update primitives/colors checks; add tier + public-API + native-fidelity + web-fallback + dual-platform checks.
- `.codex/agents/mobile-reviewer.toml` — same changes (Codex pendant).

## Build, QA, Storybook

- `@expo/ui` + `expo-haptics` (+ `burnt`) are native modules → **custom Dev Client required (no Expo Go)**, native rebuild. `expo-dev-client` already installed; New Arch on; `eas.json` exists.
- `@expo/ui` is native-only → Storybook (react-native-web-vite) shows only the RN fallback. Storybook = web-fallback/contract docs, **not** native truth; native review via iOS Simulator + Android Emulator, **screenshots of both platforms per PR**.

## Migration sequencing (one series within PR #15, no intermediate merges to `main`)

- **Phase 0 — Spike:** install `expo-haptics` (+ `burnt`); convert `ZButton`, `ZSelect`→Picker, `ZConfirmDialog`/`ZDialogPanel`→Alert/formSheet end-to-end + one full screen; run on **real iOS + Android dev builds**. Validate Host sizing, safe-area, brand-modifier fidelity, `showToast` contract, burnt compatibility. Pin latest 56.x patch.
- **Phase 1 — Guardrails + foundation:** rewrite `mobile/AGENTS.md`; update both agents (Claude + Codex); add ESLint restricted-imports + no-hex + token-sync CI check; token roles (light/dark + Platform.select) + `theme/native.ts` adapter; shared `Touchable` + haptics; type scale; `expo-symbols` (chrome first); record tier classification.
- **Phase 2 — High-leverage controls:** `ZButton`/`ZIconButton`+FAB; `ZEmptyState`/`ZQueryError` → `ContentUnavailableView` (iOS); `ZTextInput`/`ZTextarea` → TextField.
- **Phase 3 — Modal cluster:** `ZSelect`→Picker/Menu; `ZDialogPanel`→formSheet; `ZConfirmDialog`→Alert/formSheet routing; `ZToast`→Snackbar/burnt. (`ZCombobox` + long/searchable picker screen last.)
- **Phase 4 — Navigation:** native-stack headers (retire `ZPageHeader`/`ZBackHeader`) → NativeTabs (tint, symbols, `ZScreen` inset rework, verify gating + 5-tab cap).
- **Phase 5 — Polish:** Liquid Glass (iOS 26, gated); `ZSkeleton` shimmer; remaining in-content symbols; dark-mode pass; login i18n + logo asset.

## Testing strategy

- **Unit/component (jest + RNTL):** against the public `z-*` API, rendered via the bare `.tsx` fallback (jest can't render SwiftUI/Compose). Existing tests target the public API and stay.
- **Contract tests kept:** `showToast` store, `ZScreen` safe-area, permission gating.
- **Native behavior/look:** manual on Simulator/Emulator + dual-platform screenshots per PR. E2E (Maestro/Detox) optional, later.
- **Green gate:** `make mobile:lint` + `make mobile:typecheck` (incl. `.ios`/`.android`/`.types.ts`) + `make mobile:test`.

## Risks & caveats

- `burnt` unverified on this stack → Phase-0 smoke test; fallback `react-native-toast-message`.
- `@expo/ui` Host/layout edges in 56.x (matchContents, double-inset, nested scroll) — pin latest patch; confine to migrated primitives.
- `formSheet` SDK-56 quirks (keyboard/fitToContents) → numeric detents + real-hardware verify; fallback full-screen `modal` route.
- NativeTabs can't measure bar height → `ZScreen` bottom-inset rework; icon source becomes SF/Material symbols.
- `@expo/ui` Android ModalBottomSheet can't scroll RN FlatList/ScrollView (expo/expo#46379) — keep RN lists out of Android `@expo/ui` sheets; prefer `formSheet`.
- Brand identity narrows to accent + logo + canvas — confirmed acceptable.

## Open product/brand decisions (remaining for the user)
All major brand decisions are made (see Decision). None block planning. Revisit if stakeholders later want: a subtle warm-tint retained on more surfaces, or Material You dynamic color on Android.

## References
- @expo/ui stable: https://expo.dev/blog/expo-ui-stable-sdk-56
- Apple HIG (alerts, action sheets, pop-up buttons); Material 3 (dialogs, bottom sheets, menus, color roles)
- expo-router modals / react-native-screens native-stack `formSheet`; expo-symbols; expo-glass-effect; expo-haptics; `burnt`
- Research artifacts: workflow runs `native-look-research` and `sota-patterns-verify` (this session)
