# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v56.0.0/ before writing any code.

## Design Rules

- Every screen renders its content inside `ZScreen` (`src/components/ui/z-screen.tsx`) so safe-area insets are applied. Never use a bare `View` as a screen root. Tab screens pass `edges={['top']}`; intentionally edge-to-edge areas (e.g. the video player) opt out per edge.
- The webapp `web/dashboard-next` is the design reference for hierarchy, status chips, spacing, terminology, and copy. Look at the web counterpart of a screen or component before building new UI.
- Build new UI only from the `z-*` primitives in `src/components/ui/`. If one is missing, build it as the counterpart of the web wrapper — same naming, same variants (inventory in `web/dashboard-next/CLAUDE.md`). No raw `TextInput`/`Pressable` in screens.
- Colors only through NativeWind `z-*` classes or `src/theme/colors.ts` — never raw hex values. Both are generated from the dashboard tokens; run `pnpm run sync:tokens` instead of editing them by hand.
- Async content gets skeleton placeholders (`ZSkeleton`), never visible loading text.
- i18n only with keys that exist in en+de+fr of the synced dashboard JSONs (`src/i18n/locales/`, refreshed via `pnpm run sync:i18n`). Never invent keys.
- UI changes: include an emulator screenshot of the affected screens in the PR description.

### Parity-hardening rules (added after the web-parity audit — these are the deltas that earlier screens missed)

- **Web-parity is a gate, not a vibe.** Before building a screen/component, open its named counterpart under `web/dashboard-next/src/app/`, enumerate its elements, and reproduce each or defer it with a reason. Reviewers reject work checked against the plan alone.
- **`Pressable` only as a composition wrapper** (around a `ZCard`/`ZAvatar`), never as a hand-styled control. A status pill is `<ZBadge>` — a `Record<status, ZBadgeTone>` map feeding it is fine; building a pill from `rounded-full`+`bg-*`+`px-*` on a `View` is not. Toggles use `ZCheckbox`, never RN `Switch`.
- **Every query-backed surface renders four states:** pending (`ZSkeleton`) / `isError` + retry / empty / data, with `isError` checked **before** the empty branch. (Mutations are exempt — see feedback below.)
- **Mutations give feedback:** form saves → inline error banner + success toast; fire-and-forget actions → toast; destructive actions → `ZConfirmDialog`. Never a hand-rolled inline two-step confirm.
- **Keyboard:** screens with text input use `ZKeyboardAvoidingView` **and** `keyboardShouldPersistTaps='handled'` (both — the wrapper alone is insufficient).
- **Lists:** variable-length data lists use `FlatList`/`SectionList` (a `FlatList` with tab-swapped data is fine) with a real-id `keyExtractor` — never `ScrollView` + `.map()`.
- **i18n covers everything user-facing** — `label`/`placeholder`/`title`/`accessibilityLabel` and toast/alert text included. Add missing keys to the web JSON sources then `pnpm run sync:i18n`; never defer with a literal. ⚠️ `sync:i18n` is destructive — it drops mobile-only keys (e.g. `sessions.call.sessionFallback`); re-add them by hand after syncing.
- **No web counterpart?** (account deletion, Sign-in-with-Apple, push priming) follow and cite a named external spec — Apple HIG, App Store Review Guideline 5.1.1(v), `expo-apple-authentication`, `expo-notifications`.
- **Headers follow the screen type — do NOT port the web header-card verbatim** (it is a desktop pattern; "parity of information, not of layout"): **list/index** screens (Home, Videos, Sessions, Groups) use `ZPageHeader` (compact title + optional one-line subtitle, no card) + a **FAB** for the primary create action + a header icon-button/overflow for secondary/config actions; **detail** screens use an entity hero card (avatar/name/status) with contextual actions; **form/wizard** screens use a header card (title + summary) + stepper. The primary create CTA is a FAB (the `assets:create`-gated pattern), never a header button.

## Testing

- Never place test files under `src/app/` — expo-router turns them into routes. Use `src/__tests__/` or co-locate next to the component.
