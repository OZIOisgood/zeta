# Mobile Slice: Groups — Expert Create + Invite

**Goal:** Give experts the two group-management actions that exist on the web but were deferred on mobile — **create a group** and **invite members** (link/QR + optional email). Closes the create/join asymmetry: students already join via invitation; experts could not create or invite from the app.

**Status of the master plan:** package #5 (groups/invites) shipped the *read + join* surface (list, detail, accept/decline, QR-scan). This slice back-fills the *expert authoring* half that was a documented deferral. It is pulled forward ahead of compliance/release (#8) at the user's request.

## Why now / parity gate

Web counterparts (the parity reference, per `mobile/AGENTS.md`):
- `web/.../core/http/groups-api.service.ts` — `createGroup({name, description?, avatar}) → Group`; `createGroupInvitation(groupId, email?) → {id, code}`; `getGroupInvitationQrCode(groupId, invitationId) → Blob(PNG)`.
- `web/.../pages/create-group/create-group-page.component.ts` — form: **name** (required, `\S` pattern), **avatar** (`ZAvatarInput`, **required**), **description** (textarea, optional). Inline error banner on failure; submit disabled while loading; navigates to `/groups/{id}` on success.
- `web/.../pages/group-details/group-invitation-dialog.component.ts` — two-phase dialog: (1) optional-email form → create; (2) result view with **QR**, **share link** (`<origin>/groups?invite=<code>`), copy-link, download-QR, done. Success toast (`linkCreated` vs `sent`).

Backend (already implemented, all behind permissions):
- `POST /groups` → `groups.CreateGroup`, perm `GroupsCreate`. Body `{name, description, avatar}`. **`name` and `avatar` both required** (400 otherwise). Returns the `Group`. Owner is auto-added as a member.
- `POST /groups/{groupID}/invitations` → `invitations.CreateInvitation`, perm `GroupsInvitesCreate` + membership check. Body `{email?}` (optional, validated if present). Returns **`{id, code}`** with status **201**. If an email is given and maps to a registered user, sends an email + in-app notification.
- `GET /groups/{groupID}/invitations/{invitationID}/qr` → server-rendered PNG.

## Key design decisions

1. **No QR endpoint in the mobile contract — generate the QR client-side.** The web fetches a server-rendered PNG via an authenticated request and shows it in `<img>`. On RN that means an authed binary fetch piped into `<Image>` (no Bearer header on `<Image source={{uri}}>`), which is awkward and offline-hostile. Instead render the QR locally with `react-native-qrcode-svg` from the invite URL. The `createInvitation` response already returns `code`, which is all we need. → The contract gains **only** `createGroup` + `createInvitation`.
2. **QR / share-link payload = the web invite URL**, `<webBase>/groups?invite=<code>` (matches `group-invitation-dialog`'s `inviteLink`), so a QR scanned by a system camera opens the same web link the web app produces, and the in-app scanner (`mobile/src/lib/invite-code.ts`) round-trips it. ⚠️ Deferred-screen design point: mobile needs the **web invite base URL** — reuse the existing frontend/web base env if one exists; otherwise add a public config value. Confirm `invite-code.ts` parses both a bare code and the `?invite=<code>` URL before wiring.
3. **Avatar is required by the backend.** The create-group form must supply a base64 avatar — use `ZAvatarInput` (mobile counterpart) if it exists; otherwise this slice's screen step adds it (deferred work, flagged below). No silent default — match the web's required-avatar UX.
4. **Permission-gated entry points.** Create FAB on the Groups tab gated on `groups:create`; invite section on group detail gated on `groups:invites:create`. Both are WorkOS-baked JWT permissions (see memory: WorkOS permissions).

## Phase A — Contract + hooks (collision-free, execute now)

The parallel session edits `src/app/(tabs)/{videos,groups,coaching,index}.tsx` (+ possibly `group/[id].tsx`, `_layout.tsx`, Profile). This phase touches **none** of those — only the contract, generated schema, and the `api/queries/*` hook files.

### G-T1 — Contract: createGroup + createInvitation
**Files:** `docs/openapi.yaml`, regenerate `mobile/src/api/schema.d.ts`.
- [ ] `POST /groups` (operationId `createGroup`): requestBody `CreateGroupRequest {name, description?, avatar}` (required: name, avatar) → 200 `Group`; 400/401/403 (groups:create)/500. Place under the existing `/groups` path item beside `get: listGroups`.
- [ ] `POST /groups/{groupID}/invitations` (operationId `createInvitation`): path `groupID` uuid; requestBody `CreateInvitationRequest {email?}` (not required) → **201** `GroupInvitation {id, code}`; 400/401/403/500. (Static-segment routing caveat already noted in the file for `/groups/invitations/*`.)
- [ ] Schemas: `CreateGroupRequest`, `CreateInvitationRequest`, `GroupInvitation` (matches the web type name).
- [ ] `make api:openapi:lint` (0 errors). `pnpm --dir mobile run generate:api`; confirm `schema.d.ts` is idempotent and exposes the two operations.

### G-T2 — Mobile mutation hooks + tests
**Files:** `mobile/src/api/queries/groups.ts` (+ `groups.test.tsx`), `mobile/src/api/queries/invitations.ts` (+ `invitations.test.tsx`).
- [ ] `useCreateGroupMutation(client = api, qc = queryClient)` → `POST('/groups', { body })`, returns the `Group`, `onSuccess` invalidates `['groups']`. Mirror `useLeaveGroupMutation`'s injectable shape (`Poster`/`Invalidator`).
- [ ] `useCreateInvitationMutation(client = api)` → `POST('/groups/{groupID}/invitations', { params, body })`, returns `{id, code}`. No `['groups']` invalidation (creating an invite doesn't change the caller's group list). Input `{groupID, email?}`.
- [ ] Tests mirroring the existing co-located style: success path asserts the POST args + return; create-group asserts `['groups']` invalidation + no-invalidate-on-error; create-invitation asserts the 201 body returns and email-optional passes through.
- [ ] Targeted run: `pnpm --dir mobile jest src/api/queries/groups.test.tsx src/api/queries/invitations.test.tsx`. (Do NOT run the full mobile suite while the parallel session has in-flight screen files.)

## Phase B — Screens (deferred until the parallel session is fully done)

⚠️ Touches files in the parallel session's set — **do not start until the user signals their session is done.**

### G-T3 — Groups tab FAB + create-group form + invite section
- [ ] **`src/app/(tabs)/groups.tsx`:** add a `groups:create`-gated FAB (the `assets:create` FAB pattern) → routes to the create-group screen.
- [ ] **`src/app/group/create.tsx`** (new, not under a route-colliding name): form header card + name (required, ZTextInput) + avatar (ZAvatarInput, **required**) + description (ZTextarea). Inline error banner + success toast; `useCreateGroupMutation`; on success `router.replace('/group/{id}')`. `ZKeyboardAvoidingView` + `keyboardShouldPersistTaps='handled'`.
- [ ] **`src/app/group/[id].tsx`:** add a `groups:invites:create`-gated invite section/sheet — optional-email field → `useCreateInvitationMutation` → result view. Reproduce **every** web invite-dialog element (parity gate — enumerate, don't drop): client-side QR (`react-native-qrcode-svg`); **share link** `<webBase>/groups?invite=<code>`; **copy-to-clipboard** (`expo-clipboard`); **save/share the QR image** (the web's "Download QR", `group-invitation-dialog.ts:173-184/283-290` — capture the qrcode-svg via `getRef().toDataURL()` → `expo-media-library` save or fold into the `expo-sharing` share; do not silently drop it); **two-variant success toast** — `groups.inviteDialog.sent` when an email was entered vs `groups.inviteDialog.linkCreated` for a bare link/QR invite (mirror dialog `:248-254`); a **close/Done** affordance (sheet-dismiss covers the web's `common.actions.done`); and a **QR-render-failure fallback** (web `qrUnavailable`, `:130-139` — client-side QR rarely fails but enumerate it).
  - ⚠️ **Round-trip gate — confirmed real corruption, fix required before wiring:** `src/lib/invite-code.ts` `.toUpperCase()`s the parsed code, but backend codes are mixed-case (`codeAlphabet = [A-Za-z0-9]`, `invitations/handler.go:718`) looked up case-sensitively (`db/queries/groups.sql:34 WHERE code = $1`). Uppercasing corrupts ~96% of 6-char codes so accept fails. Drop the `.toUpperCase()` (validate `/^[A-Za-z0-9]{4,10}$/`, value case-preserved), fix `invite-code.test.ts` (it currently asserts the wrong `abc123→ABC123`), and re-check the existing scanner→accept path. **This is a pre-existing bug in the shipped invite-accept flow (P7-T4), not introduced here — track/fix separately; this gate just depends on it.**
- [ ] i18n: reuse the web `groups.inviteDialog.*`, `groups.create*`, `avatar.*`, `common.actions.*` keys — add any missing to the **web JSON sources**, then `pnpm --dir mobile run sync:i18n`. ⚠️ sync is destructive — re-add mobile-only keys afterward (see memory: i18n sync drift).
- [ ] Dependencies to add (native-safe): `react-native-qrcode-svg` (+ `react-native-svg`, already present?), `expo-clipboard`. `react-native-qrcode-svg` is JS-only over `react-native-svg` → no new EAS build needed. Verify before assuming.

## Verification
- Phase A: `make api:openapi:lint` 0 errors; schema regenerated + idempotent; the two hook test files green; Go suite unaffected (no Go change). Adversarial review pass (contract↔handler fidelity, hook pattern parity, web-parity gate).
- Phase B: mobile gates green (`make mobile:lint`/`typecheck`/`test`), emulator screenshots of the Groups tab FAB, create-group form, and invite sheet in the PR body.

## Out of scope / follow-ups
- Group **edit/delete** and **member removal** (`updateGroup`, `deleteGroup`, `removeGroupMember` exist on web) — a separate slice if wanted.
- OS Universal/App Links so an invite URL opens the app directly (separate backend package).
- Localizing nothing new server-side; invite email copy already localized.
