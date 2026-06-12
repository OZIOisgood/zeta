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

## Testing

- Never place test files under `src/app/` — expo-router turns them into routes. Use `src/__tests__/` or co-locate next to the component.
