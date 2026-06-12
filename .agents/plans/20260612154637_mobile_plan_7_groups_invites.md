# Mobile Plan 7: Groups + Invites (incl. QR Scan) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The Groups tab lists the user's groups; a group detail screen shows members (Students/Experts, permission-gated) and lets non-owners leave; users join groups by scanning an invite QR code with the camera or entering the 6-character code, with a confirmation step showing the group.

**Architecture:** Contract grows by group detail/members/leave and the invitation info/accept/decline operations. Hooks follow the established `src/api/queries/` patterns. New screens: `group/[id]` (detail) and `invite` (scanner + manual entry), both inside the signed-in `Stack.Protected` block. QR scanning uses `expo-camera`'s `CameraView` barcode API (works in Expo Go — no dev build needed); scanned QR payloads are the web invite URLs (`…/groups?invite=CODE`), so the scanner extracts the `invite` query param and also accepts raw codes. Design rules in `mobile/AGENTS.md` are BINDING (ZScreen, z-* primitives, token colors, skeletons, i18n only with existing en+de+fr keys, screenshot rule for the PR).

**Parent spec:** `.agents/plans/20260611225227_mobile_app_react_native_expo_design.md`
**Predecessors:** Plans 1–6 on `feat/mobile-token-auth` (PR #15 — single-PR strategy, no intermediate merges).
**Conventions:** identical to Plans 2–6 (wsl.exe wrapper, UNC file access, RNTL 14 async render, tests never under `src/app/`, per-task gates green, Conventional Commits, no `Co-Authored-By`).

---

## Backend source of truth (verified; re-read the handlers for exact codes)

Routes (`internal/api/server.go:186-201`, behind RequireAuth):
- `GET /groups/{groupID}` → group (same shape as the list's `Group` schema) — `internal/groups/handler.go` `GetGroupByID` (check perms + 404).
- `GET /groups/{groupID}/users` → students only — perm `groups:user-list:read` (403); `GET /groups/{groupID}/experts` → experts+admins — perm `groups:expert-list:read` (403). Item shape (`internal/users/handler.go:25-30`): `{id, email, first_name, last_name, avatar(omitempty), role}`.
- `DELETE /groups/{groupID}/membership` — perm `groups:membership:leave`; API rejects when the caller is the group owner or the last member (read `LeaveGroup` for the exact status/messages).
- `GET /groups/invitations/{code}` → `{group_id, group_name, group_avatar, already_member}` (read `GetInvitationInfo` fully — there may be more fields; 404 unknown code).
- `POST /groups/invitations/accept` body `{code}` → `{group_id}` (also returned when already a member); 400 used/empty code, 404 unknown. `POST /groups/invitations/decline` body `{code}` (read the handler for its response).

Permissions reality (README): students hold `groups:expert-list:read` + `groups:membership:leave` but NOT `groups:user-list:read`; experts/admins hold both list perms.

## File Structure (end state)

```
docs/openapi.yaml + regenerated schema     group detail/users/experts/leave + invitation info/accept/decline
mobile/src/api/queries/groups.ts           + useGroupQuery, useGroupStudentsQuery, useGroupExpertsQuery,
                                             useLeaveGroupMutation (+tests)
mobile/src/api/queries/invitations.ts      useInvitationInfoQuery, useAcceptInvitationMutation,
                                             useDeclineInvitationMutation (+tests)
mobile/src/components/group-card.tsx       list card (+test)
mobile/src/components/member-row.tsx       avatar/name/role row (+test)
mobile/src/app/(tabs)/groups.tsx           real Groups list + "Join group" entry
mobile/src/app/group/[id].tsx              detail: members sections, leave danger zone
mobile/src/app/invite.tsx                  QR scanner + manual code + confirmation step
mobile/src/__tests__/groups-list.test.tsx, group-detail.test.tsx, invite.test.tsx
```

---

### Task 1: Contract — group detail/members/leave + invitations

- [ ] READ the four handlers first (`GetGroupByID`, `ListGroupUsers`/`ListGroupExperts`, `LeaveGroup`, `GetInvitationInfo`/`AcceptInvitation`/`DeclineInvitation`) and write the spec to MATCH them (status codes, exact field sets — the spec follows the implementation). New operations: `getGroup`, `listGroupStudents`, `listGroupExperts`, `leaveGroup`, `getInvitationInfo`, `acceptInvitation`, `declineInvitation`. New schemas: `GroupUser` `{id, email, first_name, last_name, avatar?, role}` (required: all but avatar), `InvitationInfo` (per handler — at least `{group_id, group_name, group_avatar, already_member}`; mark required per actual serialization incl. null-handling of avatar), `AcceptInvitationRequest` `{code}` required, `AcceptInvitationResponse` `{group_id}`.
- [ ] Lint (0 errors) → `pnpm run generate:api` → mobile suite stays green (89) → commit `feat(api): add group detail and invitation endpoints to the contract`.

### Task 2: Hooks (TDD)

- [ ] Extend `src/api/queries/groups.ts`: `useGroupQuery(id)` (`enabled: id !== ''`, key `['groups', id]`), `useGroupStudentsQuery(id, enabled)` (key `['groups', id, 'students']` — accept an `enabled` flag so screens can gate on permission WITHOUT firing 403s), `useGroupExpertsQuery(id, enabled)` (key `['groups', id, 'experts']`), `useLeaveGroupMutation(id)` (DELETE membership; onSuccess invalidate `['groups']`; injectable client+qc like reviews.ts).
- [ ] New `src/api/queries/invitations.ts`: `useInvitationInfoQuery(code)` (`enabled: code !== ''`, key `['invitations', code]`), `useAcceptInvitationMutation()` (POST accept; onSuccess invalidate `['groups']`; returns `{group_id}`), `useDeclineInvitationMutation()`.
- [ ] Tests mirroring `reviews.test.tsx` conventions (hoisted QueryClient gcTime 0 + clear, await renderHook, injected fakes; assert exact paths/params/bodies; mutation-error → no invalidate). ~8 tests.
- [ ] Gates green → commit `feat(mobile): add group detail and invitation hooks`.

### Task 3: Groups list + detail screen

- [ ] `group-card.tsx`: Pressable card (accessibilityRole button, label = name) with avatar (base64 `Image`, lucide `Users` fallback in a muted tile), name, description (1 line, muted). Test: renders + onPress.
- [ ] `member-row.tsx`: avatar-or-initials tile, `first_name last_name`, muted role line. Test: renders both variants.
- [ ] `(tabs)/groups.tsx` (replace placeholder; design reference: the web groups page): `useGroupsQuery()` with skeleton rows / empty state (icon + hint) / error+retry (established patterns); FlatList of `GroupCard` → `router.push('/group/{id}')`; header row with a "Join group" `ZButton` (secondary, QR icon) → `/invite`. Test (`groups-list.test.tsx`): four states + navigation push.
- [ ] `group/[id].tsx` (NEW route, registered inside the signedIn `Stack.Protected` block): ZScreen; back arrow + group header (avatar/name/description); Experts section via `useGroupExpertsQuery(id, hasExpertListPerm)`; Students section via `useGroupStudentsQuery(id, hasUserListPerm)` — each rendered ONLY when the respective permission (`groups:expert-list:read` / `groups:user-list:read`) is present (use the `useAuth` permissions pattern), each with skeletons/empty hints; sections render `MemberRow`s. Danger zone at the bottom: "Leave group" (ZButton danger) ONLY when `groups:membership:leave` present AND `group.owner_id !== user.id`; inline two-step confirm (first press swaps to confirm/cancel ZButtons — no new dialog primitive in this plan), confirm → `useLeaveGroupMutation` → on success `router.back()` to the list; mutation error inline (danger token). Test (`group-detail.test.tsx`): sections gated by permission, leave hidden for owner, leave flow fires the mutation after confirm.
- [ ] Gates green + expo export (route `/group/[id]` present, no test routes) → commit `feat(mobile): add groups list and group detail screen`.

### Task 4: Invite flow (QR scan + code entry + confirmation)

- [ ] Install: `pnpm exec expo install expo-camera` (keep app.json plugin/permission entries; camera + barcode work in Expo Go).
- [ ] `invite.tsx` (route in the signedIn guard): three phases in one screen —
  1. **Capture**: `CameraView` with `barcodeScannerSettings={{ barcodeTypes: ['qr'] }}` and `onBarcodeScanned` (verify prop names against the installed expo-camera types); camera permission via `useCameraPermissions` — denied/undetermined state shows a request ZButton + manual entry is ALWAYS available below: `ZTextInput` (autoCapitalize characters, maxLength 6) + submit ZButton. Scanned payload parsing: try `new URL(data)` → `invite` query param; fall back to treating the raw string as the code (trim, uppercase). Debounce/lock after the first successful scan (state flag) so multi-fire `onBarcodeScanned` does not double-trigger.
  2. **Confirm**: `useInvitationInfoQuery(code)` — skeleton while loading; error/unknown code → inline error + "scan again" reset; info loaded → card with group avatar/name; `already_member` → short notice + ZButton "Open group" → `router.replace('/group/{group_id}')`; otherwise Accept (primary) / Decline (ghost) ZButtons.
  3. **Result**: accept → mutation → on success `router.replace('/group/{group_id}')` (groups list already invalidated); decline → mutation → `router.back()`. Mutation errors inline.
- [ ] Tests (`invite.test.tsx`; mock expo-camera module: `CameraView` → null component, `useCameraPermissions` → granted; mock the invitation hooks): manual code submit shows the confirmation card; accept navigates to the group with the returned group_id; already_member shows the open-group path; unknown code shows the error+reset. (Scanner-hardware behavior is not unit-testable — the URL/raw-code PARSER must be a small exported pure function `parseInviteCode(data: string): string` with its own tests incl. web-URL, raw code, junk.)
- [ ] Gates green + expo export (`/invite` route) → commit `feat(mobile): add invite flow with QR scanning`.

### Task 5: i18n + docs + final verification

- [ ] Key lookup (`groups.*`, `invitations.*`, `common.*` in the synced JSONs — the web has the full invitation dialog localized); wire matches (en+de+fr) via `useTranslation`; list non-matches as dashboard follow-ups. NO invented keys.
- [ ] `mobile/README.md`: short Groups & Invites section (QR scan in Expo Go, permission-gated member lists).
- [ ] Full battery: mobile lint/typecheck/test + api:openapi:lint + Go suite + expo export. All green.
- [ ] Commit `docs(mobile): document groups and invites`; push; update PR #15 body (Part 7); keep the emulator-screenshot checklist item (scanner + group detail screens pending manual run).

---

## Out of Scope (follow-ups)

- Deep links / Universal Links for `…/groups?invite=CODE` (AASA/assetlinks — own package together with push).
- Group creation/administration (create, rename, avatar, remove members, create invitations + QR display) — expert tooling, later package.
- Coaching (next package; introduces expo-dev-client/EAS because of Agora).

## Verification Checklist (end of plan)

- [ ] ≥100 mobile tests green; export contains `/group/[id]` + `/invite`, no test routes
- [ ] Contract idempotent; Go suite green
- [ ] Member sections and leave action correctly permission-gated; owner cannot leave
- [ ] `parseInviteCode` handles web URLs, raw codes, junk
