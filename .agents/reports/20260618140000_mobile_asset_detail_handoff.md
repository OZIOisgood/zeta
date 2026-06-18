# Mobile asset-detail — UI-kit handoff transfer

## Context
The `mobile/handoffs/handoff_ui_kit/` handoff was edited (README + `design-references/{screens.jsx,data.js,index.html}`), introducing three redesigns, all in the **Asset (video) detail** view. This task transfers them to the live screen `mobile/src/app/asset/[id].tsx` and the review-comment component, adapted to the real data model and the `z-*` primitive system (not a copy of the prototype's web markup). Branch: `feat/mobile-token-auth` (part of the single mobile PR — no intermediate merges to main).

## Decisions
- **No per-part duration / labels.** Real `AssetVideo` is `{id, playback_id, status, review_count}` — no duration, no label. The handoff renders index-based "Teil N" anyway, so pills/sheet show "Teil N" + ready/processing only. Per-part duration is a backend follow-up (out of scope) — confirmed with the user.
- **Per-part `review_count` dropped from the rail** — intentional per the handoff ("quiet but visible" switcher; "kill the cryptic global ready (2)"). A deliberate divergence from the web parts panel.
- **Empty description renders nothing** (no "noDescription" fallback) — native density choice; web still shows its fallback (and still uses the `videos.phase4.noDescription` key, which is therefore kept).
- Group name kept **strong on-surface** (not accent) to match the prototype; the row stays tappable to the group.

## Changes (3 work packages)
- **WP1 — Comment timestamp → seek pill.** New Custom-RN primitive `ZSeekChip` (`components/ui/z-seek-chip.{tsx,types.ts}`): accent-container pill + leading `play` `ZSymbol`, tabular-nums, `hitSlop` for tap target, `accessibilityLabel="Zu {time} springen"`. Replaces the plain `ZChip` on the comment author row in `components/review-item.tsx` (replies inherit it).
- **WP2 — Meta-card density** (`app/asset/[id].tsx`): dropped the in-card title (native header carries it); one identity row (avatar 24/circle + group name + right-aligned status badge; badge still shown when no group); description clamps to 2 lines with a "Mehr/Weniger anzeigen" toggle driven by an **unclamped ghost-measurer Text** (works on Android, where `onTextLayout` clamps `lines` under `numberOfLines`); UI state reset via `descReducer` on `[id, description]`; gap 12→10.
- **WP3 — Video-parts rail.** New Composition primitive `ZVideoPartRail` (`components/ui/z-video-part-rail.{tsx,types.ts}`) replaces the standalone parts `ZCard`: null at ≤1 part; horizontal pill row at 2–5 (active = secondary-container, processing dimmed + spinner + inert); "Teil X von N ▾" trigger + `ZDialogPanel` bottom sheet at >5. Decoupled props `{ parts: {id, ready}[]; activeId; onChange }`. Switching reuses the existing `setActiveId` → keyed remount of player + per-part comment thread.

## Files touched
- New: `mobile/src/components/ui/z-seek-chip.{tsx,types.ts,test.tsx,stories.tsx}`, `mobile/src/components/ui/z-video-part-rail.{tsx,types.ts,test.tsx,stories.tsx}`.
- Modified: `mobile/src/app/asset/[id].tsx`, `mobile/src/components/review-item.tsx`, `mobile/src/components/ui/tiers.ts`, the `review-item`/`asset-detail` tests, and i18n keys (`videos.seekTo`, `videos.partsLabel`, `videos.partProcessing`, `videos.partOfCount`) added to `mobile/src/i18n/locales/{en,de,fr}.json` + `web/dashboard-next/public/i18n/{en,de,fr}.json`.
- Commits `5b00b1f`, `80b97e0` (WP1), `9eb2c10`, `c6d2a61` (WP2), `c7f8fea`, `b02436b` (WP3).

## Verification
- Green gate (via WSL): `make mobile:typecheck` clean · `make mobile:lint` 0 errors (22 pre-existing warnings) · `make mobile:test` **805 passed / 110 suites**.
- Each WP passed a two-stage subagent review (spec compliance → code quality); a final integration review returned ✅ (no leftover dead code, no scope creep, i18n/parity/cross-WP wiring clean). The WP2 Android description-toggle bug found in review was fixed (ghost-measurer) and re-approved.
- **PENDING (required before PR sign-off):** iOS + Android device/emulator screenshots of the asset detail in each state — 1 part (no rail), 2–5 parts with one processing, >5 parts trigger + opened sheet, the accent seek pill (tap → seek), long description clamped then expanded. Pixel-sample colors against the handoff. Verify the >5 sheet on a real Android device given the Compose `ModalBottomSheet` no-scroll decision.

## Follow-ups
- Backend: expose per-part duration so the rail/sheet can show "Teil N · m:ss" (deferred).
- Infra nit: `Touchable` always sets `accessibilityRole="button"` even with no `onPress` (only reachable in tests/Storybook here) — fix belongs in `touchable.tsx`.
- Pre-existing governance nit: `components/review-item.tsx` imports raw `lucide-react-native` outside `components/ui/**` (untouched by this work).
- Pre-existing uncommitted `mobile/src/components/ui/z-card.android.tsx` (Compose→RN first-paint fix) is unrelated and intentionally left out of this feature's commits.
