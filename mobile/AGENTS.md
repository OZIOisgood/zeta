# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v56.0.0/ before writing any code.

## Design Rules

- Every screen renders its content inside `ZScreen` (`src/components/ui/z-screen.tsx`) so safe-area insets are applied. Never use a bare `View` as a screen root. Tab screens pass `edges={['top']}`; intentionally edge-to-edge areas (e.g. the video player) opt out per edge.
- `web/dashboard-next` is the **information/contract reference**: terminology, data fields, screen states, and copy. Look at the web counterpart before building new UI to understand what information to present and what states to handle. iOS (Apple HIG) and Android (Material 3) are the **visual references** for hierarchy, spacing, and presentation. Parity of information — NOT of layout or visual style.
- Build new UI only from the `z-*` primitives in `src/components/ui/`. No raw `@expo/ui`, `Pressable`, `Modal`, or `lucide-react-native` in `src/app/**` — those live only in `src/components/ui/**`. Each `z-*` primitive has platform internals (`.types.ts` + a complete, working bare `.tsx` web/Storybook fallback + `.ios.tsx`/`.android.tsx` where applicable). New primitives are tier-classified (see Build Tiers below).
- Colors via role tokens (light+dark) using NativeWind classes (Custom-RN tier) **or** the `theme/native.ts` token→modifier adapter (Native tier). Never raw hex values. Never per-component tinting — the orange accent applies only to interactive/primary elements; semantic colors apply to status; system-neutral colors apply to chrome. Tokens are generated from the brand seed; run `pnpm run sync:tokens` instead of editing them by hand.
- Async content gets skeleton placeholders (`ZSkeleton`), never visible loading text.
- i18n only with keys that exist in en+de+fr of the synced dashboard JSONs (`src/i18n/locales/`, refreshed via `pnpm run sync:i18n`). Never invent keys.
- UI changes: include screenshots of **both platforms** (iOS + Android) in the PR description.

## Build Tiers

Every `z-*` primitive belongs to exactly one tier. Declare it at the top of the `.types.ts` file. No tier-mixing within a single primitive's internal implementation.

**Native** — `@expo/ui` + native navigation, for every primitive that has an OS widget counterpart:
- Inputs: `ZTextInput`/`ZTextarea` → TextField; `ZSelect` → Picker(menu)/ExposedDropdownMenu; `ZCheckbox` → Toggle (iOS)/Checkbox (Android); `ZTabs` (in-page) → Segmented.
- Containers: `ZCard` → Section (iOS, inset-grouped)/Card (Android).
- Overlays: `ZDialogPanel` → formSheet; `ZConfirmDialog` → Alert (plain confirms) / formSheet (with input); `ZToast` → Snackbar (Android)/native HUD (iOS).
- States: `ZEmptyState`/`ZQueryError` → `ContentUnavailableView` (iOS), styled column (Android).
- Buttons/interactive: `ZButton`, `ZIconButton`, FAB (Android-only; iOS uses a nav-bar "+"), `ZChip`.
- Icon primitive: `ZSymbol` → SF Symbols (iOS) / Material Symbols (Android) via expo-symbols.
- Navigation: native-stack headers (no custom header primitive); bottom tabs → NativeTabs.

**Custom RN (NativeWind)** — two valid reasons:
- (a) **Brand-led canvas** (deliberately custom appearance): `login`/auth screens (logo/wordmark + native button), per-instance marquee empty states.
- (b) **No native equivalent**: `ZBadge` (semantic status pill — no OS widget maps to success/warning/danger pill), `ZStepper`, `ZIconTile`, `ZSkeleton`, `ZVideoPreview`, `ZAvatar`/`ZAvatarInput`, `ZCombobox` (search-nav pattern). All must still use native iconography (SF Symbols/Material Symbols), system fonts, and role tokens.
- (c) **Composition**: `ZDangerZoneCard` composes native sub-primitives (`ZCard` + `ZButton` + `ZConfirmDialog` + `ZIconTile`) but has no platform split of its own — the native behavior comes from its children.

**Infra/plumbing** — `ZScreen`, `ZKeyboardAvoidingView`, `ZFieldLabel`/`ZFieldError`.

### @expo/ui Compose status (device-verified, ~56.0.17, 2026-07-03)

The Native tier remains the goal, but @expo/ui's Jetpack Compose bindings have
FIVE device-verified structural defects. Consult this list BEFORE building or
"fixing back" an Android primitive; re-test only on an @expo/ui upgrade.

**Works on device (keep Compose):** TextField/OutlinedTextField (ZTextInput,
ZTextarea, ZSelect anchor), ExposedDropdownMenu (ZSelect), SegmentedButtonRow
(ZTabs), FilterChip (ZChip), Checkbox, AlertDialog (ZConfirmDialog without
children), Snackbar (ZToast), Button — filled label-only (ZButton's Compose
path).

**Broken — do NOT use from RN (retreat to the shared RN implementation):**
1. `ModalBottomSheet` never renders its window from RN hosting (any wrapping) —
   ZDialogPanel is RN on Android; sheets that capture input are formSheet
   ROUTES (react-native-screens) instead.
2. First-paint blank: Compose Hosts that mount in a NON-INITIAL commit (list
   row added after a refetch, tab-switch remount, pending→data swap) paint
   empty and never recover — killed Compose ZCard and ZIconButton.
3. Touch-swallow: RN interop children inside Compose controls eat taps on
   their own bounds (icon = dead center). If an interop child is unavoidable,
   wrap it in `<View pointerEvents="none">`.
4. Unbounded interop measurement: an unsized RN child in a Compose slot
   reports unbounded intrinsic width and overflows the parent — give interop
   children a FIXED width/height (see ZSelect's TrailingIcon).
5. Host/flex mis-layout: Hosts stretch full-width or collapse flex-1 children
   (ZFab/ZCard history) — keep flex-heavy content in NativeWind Views.

Rules of thumb: readOnly Compose TextFields keep focus after popups close —
drive "focused" colors from your own open/expanded state, never from the
field's focus. Overlays initiated from RN belong in native-stack routes
(formSheet/modal), not in Compose overlay components.

### Public-API invariant
Screens import `z-*` only. Each `z-*` keeps a **complete, working bare `.tsx` fallback** (web/Storybook/jest — `@expo/ui` is native-only, so the fallback is the NativeWind implementation). Native internals live only in `.ios.tsx`/`.android.tsx`. The bare `.tsx` must render correctly in react-native-web-vite Storybook and pass jest; it is the contract doc and test surface. Never let the fallback rot.

**Self-import ban in platform files.** Platform files (`.ios.tsx`/`.android.tsx`) must NEVER import/re-export from their own base path `./z-<name>` — Metro resolves it to the platform file itself → infinite re-export → "Maximum call stack size exceeded" at startup (invisible to jest/web; only a real dev build catches it). Shared runtime/store/presentational code goes in `z-<name>.shared.tsx`; types in `z-<name>.types.ts`; all entry files import from those.

**className/style forwarding in native platform files.** A native platform variant MUST honor EVERY public prop its `.types.ts` declares — especially `className` and `style`. The `@expo/ui` `Host` component does not reliably apply NativeWind classes, so forwarded layout props MUST be applied to an outer NativeWind `<View className={className} style={style}>` that wraps the `<Host>`. Without this wrapper, consumer layout classes (FAB positioning via `"absolute bottom-6 right-6"`, card `gap-*`/`flex-row`/margins, selected-card highlights) are silently dropped on real device builds. CI stays green because jest resolves the bare `.tsx` fallback which does honor `className`; only the native platform files are affected. The source-level scan in `src/__tests__/native-classname-forwarding.test.ts` enforces this: it reads every `.ios.tsx`/`.android.tsx` for each primitive whose `.types.ts` declares `className`, and fails if the string is absent. Adding a `className` prop to a `.types.ts` without updating both platform files will cause this test to fail.

## Native-Fidelity Rules

**Native-fidelity is the gate**: HIG (iOS) / Material 3 (Android) compliance + the tier contract. Visual divergence from `web/dashboard-next` is **expected and correct** — do not reject it.

### SOTA-as-default
Apply the platform's own guidance (HIG / Material 3) and prefer the native presentation primitive over hand-rolled RN. Choose the container by what it holds:
- **Alert**: confirms a destructive or irreversible action (plain confirm without user input).
- **Sheet / formSheet**: captures user input (text, selections, multi-step flows).
- **Snackbar / native HUD**: transient feedback (toast, success, non-critical error).
- **Menu / Picker**: picks from a short, fixed set.
- **Search screen** (`/select/[field]`, FlatList + search): picks from a long or searchable list.

Prefer zero-new-dependency native primitives (`react-native-screens` native-stack `formSheet`, `@expo/ui`). Third-party JS overlays are fallback only.

### Headers and navigation (SOTA)
- **List/index screens** (Home, Videos, Sessions, Groups): native-stack `headerLargeTitle` — not `ZPageHeader`. Primary create action: Android FAB / iOS nav-bar "+" (header-right). Secondary and config actions: header icon-button/overflow.
- **Detail screens**: native header + swipe-back + `headerBackButtonDisplayMode:'minimal'`. Content uses native inset-grouped Sections (iOS)/Cards (Android), not an entity hero card ported from the web.
- **Form/modal screens**: native `presentation:'formSheet'` or `modal`; native header + back/cancel.
- **FAB is Android-only**: the "FAB everywhere" rule is retired. iOS surfaces the same primary action via a nav-bar button (header-right). The primary action is the one gated by the user's role — `create` for creators, `join`/equivalent for students (mutually exclusive per user, no clash).

### Keyboard
Native sheets (`formSheet`) and native TextField handle the keyboard automatically. `ZKeyboardAvoidingView` + `keyboardShouldPersistTaps='handled'` is required only for remaining Custom-RN forms that are not inside a native sheet. Do not apply the KAV pattern inside native sheet routes.

## Parity and Quality Rules

- **Every query-backed surface renders four states:** pending (`ZSkeleton`) / `isError` + retry / empty / data, with `isError` checked **before** the empty branch. (Mutations are exempt — see feedback below.)
- **Mutations give feedback:** form saves → inline error banner + success toast; fire-and-forget actions → toast; destructive actions → `ZConfirmDialog`. Never a hand-rolled inline two-step confirm.
- **Lists:** variable-length data lists use `FlatList`/`SectionList` with a real-id `keyExtractor` — never `ScrollView` + `.map()`.
- **i18n covers everything user-facing** — `label`/`placeholder`/`title`/`accessibilityLabel` and toast/alert text included. Add missing keys to the web JSON sources then `pnpm run sync:i18n`; never defer with a literal. ⚠️ `sync:i18n` is destructive — it drops mobile-only keys (e.g. `sessions.call.sessionFallback`); re-add them by hand after syncing.
- **No web counterpart?** (account deletion, Sign-in-with-Apple, push priming) follow and cite a named external spec — Apple HIG, Material 3, App Store Review Guideline 5.1.1(v), `expo-apple-authentication`, `expo-notifications`.

## Testing

- Never place test files under `src/app/` — expo-router turns them into routes. Use `src/__tests__/` or co-locate next to the component.
- Unit/component tests (jest + RNTL) run against the public `z-*` API rendered via the bare `.tsx` fallback (jest cannot render SwiftUI/Compose). Existing tests target the public API and must stay green.
- **Smoke-test every native path on a real iOS + Android dev build** (not Expo Go, not just simulator) before merging. Simulator is acceptable for development iteration; real hardware is required for sign-off.
- Green gate: `make mobile:lint` + `make mobile:typecheck` (including `.ios`/`.android`/`.types.ts` files) + `make mobile:test`.
