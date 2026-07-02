# Merge origin/main → feat/mobile-token-auth (PR #15 vorbereitet)

## Kontext

Branch war 420 Commits vor der Merge-Base, main 81 voraus (Audit-Trail, Invite-Code-Soft-Launch, Feedback-Inbox, Inbound-E-Mail→Discord, Landing v2, Strido-Rename Web). Statt Rebase (hätte i18n-Konflikte über hunderte Commits wiederholt) wurde main in den Branch gemergt — der Merge-Commit verschwindet beim Squash-Merge. Merge-Commit: `f2b4aa0`.

## Entscheidungen (12 Konfliktdateien)

- **Web-i18n (en/de/fr)**: Key-Level-Dreiwege-Merge per Skript. Beidseitig geänderte Keys: `app.brand`, `user.name`, `reports.export.fileName`, `home.firstSteps.eyebrow`, `preferences.emailSummary` → main (Strido-Branding); `sessions.book.bookedHeading` → Branch (neuer Booking-Flow). +103 main-only Keys (common.legal.*, feedback.*, common.nav.inviteCodes) erhalten.
- **server.go**: Union der Imports/Wiring (Branch `devices` + Push-Notifier, main `discord`/audit/contact/feedback/inboundemail). Branchs veralteter Routen-Block gelöscht; `devicesHandler.RegisterRoutes` in mains Struktur **innerhalb `RequireActiveAccess`** — konsistent mit allen Feature-Routen, App ruft `/devices` noch nicht auf (Push-B deferred), daher folgenlos.
- **Scheduler-Secret**: main gewann semantisch — Middleware `auth.RequireSchedulerSecret` statt Branch-Handler-Feld; 4 `TestCompleteUpload_*`-Aufrufe auf 5-Arg-Signatur angepasst.
- **auth /me**: mains `EnsureUserAccess` (Waitlist) + Branchs `push_preferences` koexistieren; fehlende Mock-Expectation in `TestMe_IncludesPushPreferences` ergänzt.
- **internal/db** (models/querier/mocks): nicht textuell gelöst, sondern mit sqlc + mockgen regeneriert (Migrations/Queries waren konfliktfrei).
- **ci.yml**: Union — mains Landing-Container-Step im Web-Job + Branchs `lint-openapi`/`lint-and-test-mobile`-Jobs.
- README/docker-compose/.env.example: triviale Unions bzw. mains Kommentarfassung.

## Verifikation (gemergter Stand)

- Go: build + `go test ./internal/...` + vet grün
- Web: 142/142 Vitest, Lint, Build grün
- Mobile: 817/113 Jest, Lint 0 Errors, tsc grün
- GitHub CI: alle 4 Jobs grün (nach dem History-Rewrite erneut auf dem neuen Tip)

## Nachtrag: businessplan.md aus der Historie entfernt

`docs/businessplan.md` war versehentlich committet (im WIP-Batch) und gepusht. Entfernt per `git filter-branch --index-filter` über exakt die 6 Branch-Commits (`--not origin/main`), damit mains Commits und der Merge-Parent unangetastet bleiben; verifiziert (Tree-Diff alt→neu = nur die eine Datei, Merge-Parent = origin/main-Tip), dann Force-Push. `docs/businessplan.*` steht jetzt in `.gitignore`; die PDF war nie committet. Rest-Risiko: alte SHAs bleiben bei GitHub bis zu deren GC per Direktlink abrufbar (vollständige Löschung nur via GitHub Support), und existierende Clones behalten die alte Historie.

## PR #15

Beschreibung neu geschrieben (Foundation → Expert-Parity → Redesign → Review-Fix-Run → Merge), 8 kuratierte Emulator-Screenshots unter `.agents/reports/assets/pr15/` (SHA-stabile Raw-URLs). Status MERGEABLE.

## Offene Gates vor dem Squash-Merge

1. iOS-Device-Smoke-Test (mobile/AGENTS.md: echte Hardware beide Plattformen)
2. WorkOS: `zeta://login` als Logout-Redirect whitelisten, **dann** `MOBILE_LOGOUT_RETURN_TO` setzen
3. `EXPO_PUBLIC_WEB_BASE_URL` in mobile/.env
4. Follow-up-Task: Mobile-Brand Zeta→Strido
