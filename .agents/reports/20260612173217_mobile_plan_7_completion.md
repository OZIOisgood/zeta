# Completion Report: Mobile Plan 7 — Groups + Invites

- **Date:** 2026-06-12
- **Plan:** `.agents/plans/20260612154637_mobile_plan_7_groups_invites.md`
- **PR:** https://github.com/OZIOisgood/zeta/pull/15 (seventh work package; single-PR strategy)

## What landed

- Contract: `GET /groups/{groupID}`, member lists (with the `{data:[…]}` envelope), `DELETE …/membership` (204, 400 owner, 409 last member), `GET /groups/invitations/{code}`, accept (200 `{group_id}`, already-member short-circuit), decline (204, anti-oracle 404) — all verified against the Go handlers; the new `no-ambiguous-paths` lint warning is documented inline (chi routes static segments first).
- Hooks: `useGroupQuery`, permission-`enabled` member queries (no 403 noise for students), `useLeaveGroupMutation`, `useInvitationInfoQuery`, accept/decline mutations.
- UI: GroupCard/MemberRow (shared `avatarSrc` helper, translated roles), Groups tab (skeleton/empty/error/refresh + Join-group entry), `group/[id]` (gated member sections with real separators, two-step leave confirm, owner excluded), `/invite` (expo-camera QR scan with scan-lock + junk-safe `parseInviteCode`, validated manual entry with inline hint, confirmation card, already-member path, accept/decline).
- i18n done the designed way: 10 new `groups.invite.*` keys added to the DASHBOARD translation sources (en/de/fr, tone-matched: du-Form de, vous-Form fr) and synced to mobile; ZTextInput gained autoCapitalize/autoCorrect/returnKeyType/onSubmitEditing, ZButton icon/testID.

## Defects caught by the review loops (fixed in-range)

1. Manual code entry bypassed validation (raw strings reached the API) → parse-only with inline validation hint.
2. `divide-y` is a NativeWind no-op → explicit separator views.
3. Hardcoded leave-error despite existing key; invite screen initially shipped ~10 English literals → fixed via dashboard-side keys + sync (the root-cause path).
4. Inverted permission prose in mobile/README; duplicated `avatarSrc`; raw role slugs → existing `groups.roles.*` keys.
5. One reviewer false positive (test-mock path) was disproven by the fix agent via actual resolution semantics instead of blind compliance.

## Verification

133 mobile tests (33 suites), tsc, lint, `expo export` (16 routes), OpenAPI lint + schema idempotency, full Go suite, web-next prettier after the dashboard JSON edits — all green. Emulator screenshots (groups list, detail, scanner) pending manual run — unchecked PR checklist item.

## Follow-ups

- Deep links / Universal Links for invite URLs (bundle with push package).
- Group administration (create/rename, invitation creation + QR display) — expert tooling.
- Next package: **Coaching (booking + Agora calls)** — first native module: requires `expo-dev-client` + EAS build setup (user involvement: EAS account/credentials), ending Expo-Go-only development.
