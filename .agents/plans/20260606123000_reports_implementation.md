# Reports — Implementierungsplan

## Kontext

Experten und Schüler sollen Reports sehen, die zeigen, **wann sie Videos
hochgeladen** haben und **wann sie Live-Coachings** hatten (mit welchem Schüler
/ welchem Experten). Anforderungen:

- Aggregation pro **Monat / Quartal / Jahr**.
- Kennzahlen: **Video-Länge**, **Live-Session-Länge**, **Zeitpunkt** des Ereignisses.
- **Experten-Report**: gruppiert nach **Schüler** und nach **Gruppe**.
- **Schüler-Report**: gruppiert nach **Gruppe** und nach **Experte**.
- **Später (Phase 2)**: Export als **PDF** und **CSV/Excel**.

Diese Datei ist der Plan. Implementierung erfolgt in einer separaten Session
(siehe `executing-plans`). Datenmodell unten basiert auf dem realen Stand
(`internal/db/models.go`, `db/queries/*.sql`, `internal/api/server.go`).

## Datenquellen (Ist-Zustand)

| Ereignis | Tabellen | Vorhandene Felder | Lücke |
|---|---|---|---|
| Video-Upload | `assets` (`owner_id`, `group_id`, `created_at`) → `videos` (`asset_id`, `status`, `created_at`) | Wer, wann, welche Gruppe | **Keine Video-Dauer gespeichert** |
| Live-Coaching | `coaching_bookings` (`expert_id`, `student_id`, `group_id`, `scheduled_at`, `duration_minutes`, `is_cancelled`) | Wer, wann, Soll-Dauer | Ist-Dauer nur via `coaching_booking_recordings` (`started_at`/`stopped_at`) |
| Namen / Anzeige | `user_preferences` (`first_name`, `last_name`, `avatar`) | Auflösung WorkOS-ID → Name | — |
| Gruppen | `groups` (`name`), `user_groups` | Gruppenname, Mitgliedschaft | — |

User-IDs (`owner_id`, `expert_id`, `student_id`) sind WorkOS-String-IDs. Namen
werden **nicht** in der DB an die Events gehängt, sondern über
`user_preferences` aufgelöst (Muster: `internal/coaching/users.go:resolveUsers`).

## Entschiedene Eckpunkte (verbindlich)

| Thema | Entscheidung |
|---|---|
| **Video-Dauer** | **Persistieren** — Spalte `videos.duration_seconds`, gefüllt via **Backfill/Lazy-Fetch** (kein Mux-Webhook). |
| **Session-Dauer** | **Soll-Dauer** `coaching_bookings.duration_minutes`. Ist-Dauer (Recording) vorerst nicht. |
| **Report-Umfang** | **Nur Eigendaten** — eine Permission `reports:read`, eine Query-Variante. Kein gruppenweiter Report. |

### Video-Dauer — Umsetzung

Die Anforderung „Video-Länge" ist heute nicht erfüllbar: `videos` hat keine
`duration`-Spalte und es gibt **keinen Mux-Webhook** (Playback-IDs werden in
`internal/assets/handler.go` lazy von Mux geholt). Gewählter Weg:

- **Migration:** `videos.duration_seconds numeric NULL` (siehe Backend §1).
- **Lazy-Fetch:** im bestehenden Mux-Abruf-Pfad
  (`fetchPlaybackIDFromMux` / `UpdateVideoStatus*` in
  `internal/assets/handler.go`) die Asset-Dauer von Mux mitlesen und mitschreiben.
  Kein neuer Webhook-Endpoint, keine Mux-Webhook-Config nötig.
- **Backfill:** einmaliger Job/Query, der für bestehende `ready`-Videos ohne
  `duration_seconds` die Dauer von Mux nachzieht.
- `duration_seconds` bleibt **nullable**; Reports summieren mit
  `COALESCE(SUM(duration_seconds), 0)` und kennzeichnen unvollständige Daten in
  der UI nicht als 0-Länge, sondern als „—" wo sinnvoll.

### Session-Dauer — Umsetzung

`duration_minutes` (Soll) verwenden. Nur **abgeschlossene, nicht stornierte**
Bookings: `is_cancelled = false AND scheduled_at < now()`. Recording-Ist-Dauer
ist bewusst out of scope (mögliches Folge-Increment).

## Architektur

Neues Backend-Paket `internal/reports` (Muster: `internal/coaching`), neue
sqlc-Queries in `db/queries/reports.sql`, neue Permission, neue Routes. Frontend:
neue Page + NgRx-Signal-Store + API-Service + Route mit `permissionGuard`.

### Aggregations-Modell

Ein Report = Liste von **Perioden-Buckets** (per `date_trunc('month'|'quarter'|
'year', ts)` mit Timezone-Korrektur via `user_preferences.timezone`), jeweils mit
zwei **Gruppierungs-Dimensionen**:

- **Experten-Report** (`expert_id = me`): Buckets → Untergruppierung nach
  `student_id` und nach `group_id`.
- **Schüler-Report** (`student_id = me` bzw. `owner_id = me` für Uploads):
  Buckets → Untergruppierung nach `group_id` und nach `expert_id`.

Jede Zeile: `{ period, group, counterpart(student|expert), video_count,
video_seconds_total, session_count, session_minutes_total, first_at, last_at }`.

## Backend

### 1. Migration + Dauer-Erfassung

`db/migrations/<ts>_add_duration_to_videos.{up,down}.sql`
- `ALTER TABLE videos ADD COLUMN duration_seconds numeric;` (nullable, kein Default).
- Down: `DROP COLUMN duration_seconds;`
- **Lazy-Fetch:** in `internal/assets/handler.go` dort, wo Playback-ID lazy von
  Mux geholt wird (`fetchPlaybackIDFromMux` + `UpdateVideoStatus*`), zusätzlich die
  Mux-Asset-`duration` lesen und in `duration_seconds` schreiben. Neue Query
  `UpdateVideoDuration` (oder bestehende Update-Query erweitern).
- **Backfill:** einmaliger Durchlauf über `videos WHERE status='ready' AND
  duration_seconds IS NULL`, der die Dauer von Mux nachzieht (CLI-Task oder
  internal-Endpoint analog `/internal/coaching/*`, Secret-geschützt).
- Kein Mux-Webhook-Endpoint nötig.

### 2. Permission

`internal/permissions/permissions.go`: `ReportsRead = "reports:read"`.
- **Wichtig:** Permissions werden **nicht** im Code an Rollen gemappt, sondern in
  **WorkOS** verwaltet — `internal/auth/handler.go:getPermissionsForRole` holt die
  Permission-Liste pro Rolle über die WorkOS-Organizations-Roles-API. Die Go-Konstante
  allein bewirkt nichts; `reports:read` muss in WorkOS den Rollen **Experte und
  Schüler** zugewiesen werden, sonst hat kein User die Permission. → **Offene Frage 7.**
- Test in `permissions_test.go` für die Konstante ergänzen (mehr lässt sich nicht
  unit-testen, da das Mapping extern ist).

### 3. sqlc-Queries — `db/queries/reports.sql`

Parametrisiert über Periode (`date_trunc`-Argument als String/Enum), `from`/`to`,
User-ID, Timezone. Beispiele:

- `ReportUploadsByStudentGroup` — Experten-Sicht: Uploads in Gruppen, in denen ich
  Experte/Owner bin, gruppiert nach `period, group_id, owner_id`,
  `COUNT(v.*)`, `SUM(v.duration_seconds)`, `MIN/MAX(a.created_at)`.
- `ReportUploadsForStudent` — Schüler-Sicht: eigene Uploads (`a.owner_id = $me`),
  gruppiert nach `period, group_id` (Experte = Gruppen-Owner/Experten der Gruppe).
- `ReportSessionsForExpert` — `coaching_bookings WHERE expert_id = $me AND
  is_cancelled = false AND scheduled_at < now()`, gruppiert nach `period,
  student_id, group_id`, `COUNT(*)`, `SUM(duration_minutes)`.
- `ReportSessionsForStudent` — analog mit `student_id = $me`, gruppiert nach
  `period, group_id, expert_id`.

Hinweise:
- Timezone-korrekte Bucket-Grenzen: `date_trunc($period, ts AT TIME ZONE $tz)`.
  Die User-Timezone kommt aus `user_preferences.timezone` (Query `GetUserTimezone`
  existiert bereits). **Hinweis:** Coaching wendet Timezone heute in **Go** an
  (`time.LoadLocation` in `internal/coaching/slots.go`/`bookings.go`), **nicht** in
  SQL — der `AT TIME ZONE`-in-SQL-Ansatz ist hier neu. Alternative: Buckets in Go
  bilden. SQL bevorzugt (aggregiert serverseitig, exportfreundlich).
- `$period` als sqlc-Argument (`@period`), validiert im Handler auf
  `month|quarter|year` (kein roher SQL-Inject).
- Sichtbarkeit/Autorisierung: User-ID **immer** in der WHERE-Klausel — ein User
  sieht nur eigene Daten (analog `ListMyBookings`). Kein gruppenweiter Report ohne
  zusätzliche Permission.
- Nach Änderung `make db:sqlc` ausführen.

### 4. Handler — `internal/reports/handler.go`

- `NewHandler(q db.Querier, workos auth.UserManagement, logger *slog.Logger)`.
- `RegisterRoutes(r chi.Router)` unter `auth.RequirePermission(permissions.ReportsRead)`:
  - `GET /reports/summary?period=month|quarter|year&from=&to=&role=expert|student`
  - Rolle aus User-Permissions ableiten (nicht blind aus Query vertrauen — wer
    keine Experten-Daten hat, bekommt leere Experten-Sicht).
- DTOs: Perioden-Buckets + Untergruppen; Namen via `resolveUsers`-Muster
  (Helper ggf. nach `internal/users` o. shared ziehen statt duplizieren).
- Strukturiertes Logging: `component="reports"`, stabile snake_case-Events
  (`report_summary_failed`, …), Fehler im `err`-Feld. **Keine PII/Emails loggen**
  (nur User-IDs, nicht Namen/Emails).
- Wiring in `internal/api/server.go`: Handler bauen + `reportsHandler.RegisterRoutes`
  in der protected Group.

### 5. Tests

- `internal/reports/handler_test.go`: Autorisierung (fremde Daten nicht sichtbar),
  Perioden-Param-Validierung, Aggregations-Korrektheit (mit `db.Querier`-Mock oder
  Integrationstest gegen `testdb`).
- `make test:unit`; bei Query-Logik `make test:integration`.

## Frontend (`web/dashboard-next`)

> Vor UI-Bau: `z-*`-Inventar prüfen (`shared/ui`). Keine rohen HTML-Controls.

### 1. API-Service — `core/http/reports-api.service.ts`

Typisierter Client für `GET /reports/summary` (Period-/Role-/Range-Params).

### 2. Store — `features/reports/reports.store.ts`

`signalStore` mit `AsyncSlice`-Helpern (`core/state/async-state.ts`): State =
gewählte Periode, Rolle, Range, geladene Buckets; Methods `load`, `setPeriod`,
`setRange`. Spec-Datei für Lade-/Fehlerzustände.

### 3. Page — `pages/reports/reports-page.component.ts`

- Filter: `z-segmented-control` (Monat/Quartal/Jahr), optional Datumsbereich
  (`z-text-input type=date`), Rollen-Umschalter falls User beide Rollen hat.
- Darstellung: Tabellen/Cards je Periode, aufgeklappt nach Schüler/Gruppe bzw.
  Gruppe/Experte. Dauer human-readable (z. B. `1h 23m`, `12:30 min`).
- **Skeletons** statt Ladetext; `z-empty-state` für „keine Daten".
- Alle Strings via **Transloco** (`reports.*` in `public/i18n/{de,en,fr}.json`).
- Icons via `@lucide/angular`.

### 4. Route + Navigation

- `app.routes.ts`: `{ path: 'reports', component: ReportsPageComponent,
  canActivate: [permissionGuard], data: { permission: 'reports:read' },
  title: 'Reports' }`.
- Nav-Eintrag in der Shell (Sichtbarkeit an `reports:read` gebunden).

### 5. Verifikation Frontend

`make web-next:build`, `make web-next:test`; neue/angepasste Shared-Primitives
→ `.stories.ts` + `make web-next:storybook:build`.

## Phase 2 — Export (PDF, CSV/Excel)

Separater Increment, nicht Phase 1. Skizze:
- **CSV/Excel**: Backend-Endpoint `GET /reports/export?format=csv|xlsx&…`
  streamt die bereits aggregierten Buckets (CSV via `encoding/csv`; XLSX via
  `excelize`). Alternativ Frontend-CSV aus geladenen Daten (schneller, aber
  ohne Server-Formatierung).
- **PDF**: serverseitig (HTML→PDF, z. B. via Headless-Renderer) oder
  Frontend-Print-Stylesheet. Tooling in Phase 2 entscheiden (**Offene Frage 1**).
- I18n der Spaltenüberschriften; Dateiname mit Periode/Range.
- Keine neuen Datenpfade — Export nutzt dieselben Query-Ergebnisse wie die UI.

## Reihenfolge / Schnitt

1. Migration `videos.duration_seconds` + Lazy-Fetch der Mux-Dauer + Backfill → `make db:sqlc`.
2. Permission `reports:read` (Go-Konstante + WorkOS-Rollen-Config, s. Offene Frage 2) + Test.
3. `db/queries/reports.sql` → `make db:sqlc`.
4. `internal/reports` Handler + Wiring + Tests → `make test:unit`.
5. Frontend: API-Service → Store → Page → Route/Nav → i18n.
6. `make web-next:build` + `make web-next:test`.
7. (Phase 2) Export.

Jeder Schritt ist eigenständig commit-bar. Schritt 1 (Video-Dauer) ist von den
Coaching-Queries unabhängig und kann parallel laufen.

## Verifikation (Definition of Done, Phase 1)

- `make db:sqlc` ohne Diff-Überraschungen, `make api:build` grün.
- `make test:unit` (+ ggf. `make test:integration`) grün — inkl. Autorisierungstest.
- `make web-next:build` + `make web-next:test` grün.
- Manuell: Experte sieht Buckets nach Schüler/Gruppe; Schüler nach Gruppe/Experte;
  Perioden-Umschaltung Monat/Quartal/Jahr korrekt; fremde Daten **nicht** sichtbar.
- `.env.example`/Terraform aktualisiert, falls neue Config nötig (Backend-Regel).
- Report/Doku-Eintrag unter `.agents/reports/` nach Abschluss.

## Geklärt (eingearbeitet)

- **Video-Dauer**: persistieren via Lazy-Fetch + Backfill (kein Webhook).
- **Session-Dauer**: nur Soll (`duration_minutes`), stornierte ausgeschlossen.
- **Umfang**: nur Eigendaten, eine Permission, kein gruppenweiter Report.

## Offene Fragen (nicht blockierend für Phase 1)

1. **PDF-Tooling** (Phase 2): serverseitig (HTML→PDF) vs. Frontend-Print.
   CSV/XLSX sind klar (`encoding/csv` / `excelize`).
2. **WorkOS-Rollen-Config**: `reports:read` muss in WorkOS (nicht im Code) den
   Rollen Experte/Schüler zugewiesen werden, bevor das Feature greift — wer pflegt
   das? Implementierung kann starten; ohne diesen Schritt sieht aber kein User die UI.
