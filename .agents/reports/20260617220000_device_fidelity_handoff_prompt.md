# Handoff prompt — device-driven 1:1 fidelity pass (Zeta mobile)

> Paste everything below into a fresh session. It is self-contained.

---

## Mission
Make the Zeta **mobile** app render **1:1 with the UI-kit handoff**, verified on a **real Android dev build**, walking screen by screen. For each handoff screen: render it on the device → screenshot → diff against the handoff → fix → re-screenshot → only then move on.

## THE critical lesson (why the previous pass produced "green but wrong")
A prior large "1:1 fidelity" pass passed jest, code reviews, typecheck and green gates — yet on the **device** divergence after divergence surfaced (blank login, wrong video-card layout, 16:9 thumbnails, grey "View all" link, bordered date pills, mis-coloured outline button). **Root cause:** `jest` / reviews / typecheck render ONLY the bare **NativeWind `.tsx` fallback** — never the **`@expo/ui` native Compose** components that actually ship on device. They are structurally **blind** to native-render divergence.

➡️ **The ONLY valid fidelity check is a device screenshot diffed against the handoff.** Green gate is necessary (no regressions) but **NOT sufficient**. Never claim a screen is 1:1 without a device screenshot.

## Handoff = source of truth
- `mobile/handoffs/handoff_ui_kit/README.md` — the contract: role-token table (exact light/dark hexes), radii (field 12 / tile 16 / card 20 / hero 28 / FAB 16), type (**Nunito Sans**; screen titles 700/800; interactive labels 600; body 400/500), per-primitive deltas.
- `mobile/handoffs/handoff_ui_kit/design-references/screens.jsx` + `screens2.jsx` + `screens3.jsx` — the prototype: authoritative **structure** + per-component props/values. `index.html` is the live mock.
- Rule: **"Im Zweifel gewinnt das Handoff."** Source every value from the **role tokens** (`bg-accent`, `text-on-surface`, `useRoleColors()`), **never** the prototype's raw hexes.

## Device connection (Android emulator on Windows, Metro in WSL — FRAGILE; this is the hard part)
- `adb` runs on **Windows** (the Bash tool runs on Windows). `adb devices` → `emulator-5554`. App package: **`com.m4xon.zeta`**.
- **Screenshot (your verification tool):** `adb exec-out screencap -p > "$TEMP/x.png"` then Read the PNG.
- **Logs:** `adb logcat -d -s ReactNativeJS:*` — the app's `console.log`/errors pipe here and to Metro. Instrument by adding a temporary `console.log` to a component to inspect runtime state.
- **WSL commands** (pnpm/make/git): wrap as `wsl.exe -d ubuntu bash -lc 'cd /home/heinrich/dev/projects/zeta && <cmd>'`. File edits via UNC paths `\\wsl.localhost\ubuntu\home\heinrich\dev\projects\zeta\...`.
- ⚠️ **Metro's file-watcher is DEAD here** → Fast Refresh does NOT propagate edits → Metro serves a **stale bundle**. After ANY edit you MUST restart Metro **with `--clear`**:
  `wsl.exe -d ubuntu bash -lc 'pkill -f "expo start"'` then start detached (run_in_background): `wsl.exe -d ubuntu bash -lc 'cd /home/heinrich/dev/projects/zeta/mobile && exec npx expo start --port 8082 --clear'`. Wait for `curl -s localhost:8082/status` → `packager-status:running` (cold rebuild ~30-60s).
- ⚠️ **Connectivity drops on every Metro restart.** After each restart re-set: `adb reverse tcp:8082 tcp:8082` and `adb reverse tcp:8080 tcp:8080`. Then relaunch: `adb shell am force-stop com.m4xon.zeta; adb shell am start -n com.m4xon.zeta/.MainActivity` (NEVER fire a `zeta://...` deep link → DevLauncher NPE). If it lands on the Expo DevLauncher picker, ask the user to tap the `10.0.2.2:8082` server (you can't tap it reliably). App connects to Metro at `10.0.2.2:8082`.
- `.env` is on the **local backend**: `EXPO_PUBLIC_API_URL=http://localhost:8080` (+ the `adb reverse tcp:8080`); backend runs on the WSL host `:8080`. Original `.env` backed up at `mobile/.env.bak.*`.
- Green gate (no-regression, NOT fidelity): `make mobile:lint` + `make mobile:typecheck` + `make mobile:test`.

## Native-render footguns — fix at the ROOT (shared primitive), not per instance
Invisible to jest; caused most of the misses:
1. **`Host` vertical collapse:** a Compose `<Host matchContents={{ horizontal: true }}>` (no `vertical`) collapses to **0 height** in a centered/height-auto layout → invisible. `z-card.android.tsx` has exactly this — it blanked the **login** (worked around by rendering the login card as a plain `View`). The primitive is still vulnerable for any centered `ZCard`. **Fix:** `matchContents={{ horizontal: true, vertical: true }}` and re-verify Home cards on device.
2. **Nested Hosts:** a Host inside another Host's RN children (e.g. a native `ZButton` inside a native `ZCard`) can swallow touches / mis-measure.
3. **Content/`fg` colors in `.android` files:** verify secondary/link/etc. text colors are the intended role token, not a dark "on-container" colour (the View-all link was `on-accent-container` ≈ near-black; fixed to `accent`).
4. **Self-imposed shape/aspect:** `z-video-preview` forced `aspect-video` 16:9 (fixed → fills its container). Audit other primitives that impose their own size/radius/aspect over the consumer's box.
5. **"Pill" rendering:** `ZBadge tone="neutral"` = `border-outline bg-surface-variant text-on-surface-variant` (bordered, muted). The handoff's eyebrow/date pills are **filled `surface`, no border, `on-surface` text** (fixed in next-session-card; audit other pill usages).
6. **FAB width:** a Compose Host stretches full-width unless the inner View has `alignSelf:'flex-end'` (already fixed in `z-fab.android`).

## Font bug — DIAGNOSED (apply a fix, then confirm on device)
**Symptom:** brand text (e.g. the next-session card title/pills) renders in the **system font (Roboto)** on Android, not Nunito Sans.

**Root cause (Android-only):** the setup loads all 5 Nunito faces (`mobile/src/app/_layout.tsx` `useFonts`) and maps each weight utility to its face in `mobile/global.css` `@layer base` (`.font-bold → NunitoSans_700Bold`, …). BUT Tailwind's `font-bold`/`font-extrabold`/`font-semibold` utilities ALSO emit a numeric `fontWeight` (700/800/600), and that weight lives in the **utilities** layer which outranks `@layer base` — so it can't be stripped there. Every weighted element therefore ships BOTH `fontFamily: 'NunitoSans_700Bold'` AND `fontWeight: '700'`. Android has no `NunitoSans` *family* with weighted members (each face is registered as its own single-weight family), so a named-face + numeric-weight lookup is unreliable → it falls back to Roboto. iOS/CoreText resolves the face name and ignores the redundant weight → looks correct on iOS, wrong on Android. `tailwind.config.js` defines NO `fontFamily`, confirming the weight utilities are the stock ones.

**Fix — pick one, then confirm with a zoomed device screenshot:**
- **(C, recommended, idiomatic) register ONE weighted family.** Use the `expo-font` config plugin to bundle the 5 TTFs as a single family `NunitoSans` with weight mappings (Android emits an XML font family with weight attrs); set the Text default to `fontFamily:'NunitoSans'` and let the `font-*` weight utilities drive weight normally. Keeps every existing `font-*` className. **Needs a dev-build rebuild** (`npx expo prebuild` + rebuild).
- **(A, no rebuild) decouple family from weight.** Add `fontFamily` utilities in `tailwind.config.js` (`fontFamily: { 'nunito-bold': ['NunitoSans_700Bold'], … }` — these set ONLY `font-family`, no weight) and replace brand-text weight classes (`font-bold`→`font-nunito-bold`, …); drop the `@layer base` font hack. No numeric weight reaches Android.
- Do NOT keep the current `@layer base` font-family override on its own — it cannot remove the conflicting numeric weight, which IS the bug.

## Screens to walk (render → screenshot → diff → fix → re-screenshot)
Home · Videos · AssetDetail · Sessions(coaching) · Groups · GroupDetail · Profile · Preferences · Notifications · Upload · BookSession · CreateGroup · GroupPreferences · Invite · Reports · Call · Login. (Login + Home video tiles + next-session card were partially fixed last round — re-verify, don't assume.)

## Genuine data/contract gaps — do NOT fabricate
- `Asset` has no `duration` field → no duration overlay on video thumbnails (backend).
- `InvitationInfo` API lacks member-count/inviter/description → invite confirm subtitle/description impossible (backend).
- Login "create account" button — WorkOS AuthKit is one hosted flow (no separate signup) + no i18n key (product/auth + i18n).
- Profile tab title: no `Profil` i18n key (reused `preferences.title`).
- Subtitle group-vs-description, first-steps hidden when onboarding complete — **real data vs the mock**, not bugs.

## Git / environment state
- This-session device fixes are committed: **`62fa741`** on branch `feat/mobile-token-auth` (login, asset-card, z-button.android, z-video-preview, next-session-card).
- The tree has **uncommitted WIP from the user** (dark-mode accent tokens in `global.css`/`roles.ts`/`sync-tokens.mjs`, `_layout.tsx` fontError guard, `(tabs)/_layout.tsx` tab tint, and more). Run `git status` + `git diff` and **ask the user what's theirs vs. to-commit before touching anything**. Stage explicit paths only — **never `git add -A`**. No `Co-Authored-By` trailer (repo convention). Squash-merge style; commit per screen or coherent batch.
- Prior records: `.agents/plans/20260617120000_mobile_ui_kit_handoff_adoption_plan.md`; `.agents/reports/20260617180000_*adoption_report.md`; `.agents/reports/20260617210000_*fidelity_pass_report.md`.

## Per-screen workflow
1. Metro fresh (`--clear`) + reverse re-set + app relaunched + screenshot the target screen.
2. Open the matching prototype function in `screens*.jsx`.
3. List **every** visual delta: colour (which role token), type (weight/size/family), radius, spacing, structure (which element where), icon (ZSymbol name).
4. Fix — role tokens only (no raw hex), reuse `z-*` primitives, fix footguns **in the shared primitive** when the divergence is primitive-level. Watch the tier rules (`mobile/AGENTS.md`): native where few instances, Custom-RN where repeated in lists; login = brand-led NativeWind canvas.
5. `--clear` reload → re-screenshot → confirm it **matches** before moving on.
6. Green gate at the end of a batch; commit (explicit paths, no co-author).
