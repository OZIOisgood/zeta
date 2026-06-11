# Training Plans v1 — Design Spec

Datum: 2026-06-11 · Status: abgestimmt (Brainstorming-Session)

## Kontext & Ziel

Experten (Gruppen-Owner) sollen Trainingspläne anlegen können (z. B. Turnieraufgaben),
die Reiter nachreiten und zu denen sie Videos hochladen. Der bestehende
Upload-/Review-Flow bleibt unverändert; der Planbezug ist ein optionales
Kontext-/Filter-Attribut auf Assets.

Kern von v1: **Content-Verteilung + Video-Zuordnung.** Kein Status-Tracking,
keine Bewertungsnote, kein TTS (siehe Follow-ups).

## Entscheidungen

- Eigenständige Entität `training_plans` (kein Asset-Subtyp).
- Plan gehört zu genau **einer Gruppe** (wie Assets); Wiederverwendung später per Duplizieren.
- Struktur: Titel + optionale Beschreibung + **geordnete Schrittliste** (`TEXT[]`).
  Strukturierte Schritte sind die Basis für späteres TTS.
- Lebenszyklus: frei **editierbar + archivierbar**, kein Löschen in v1.
  Archivieren setzt `archived_at`; bestehende Videoverknüpfungen bleiben erhalten.
- Reviews/Kommentare: unverändert über `video_reviews` (zeitgestempelte Kommentare)
  und `assets:finalize`. Keine formale Ausführungsnote in v1.

## Datenmodell

```sql
CREATE TABLE training_plans (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id    UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    owner_id    TEXT NOT NULL,
    title       TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    steps       TEXT[] NOT NULL DEFAULT '{}',
    archived_at TIMESTAMPTZ,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE assets ADD COLUMN training_plan_id UUID
    REFERENCES training_plans(id) ON DELETE SET NULL;
```

`ON DELETE SET NULL` als Sicherheitsnetz, obwohl v1 kein Löschen anbietet.
Leere Schrittliste ist erlaubt (Plan kann reiner Beschreibungstext sein), leerer Titel nicht.

## Backend

Neues Paket `internal/trainingplans/` nach dem Muster von `internal/assets/`
(Handler/Service/Queries getrennt, sqlc, `make db:sqlc` nach Schemaänderung).

Endpunkte:

- `POST /groups/{groupId}/training-plans` — anlegen (Experte)
- `GET /groups/{groupId}/training-plans` — Liste; archivierte nur für Owner
- `GET /training-plans/{id}` — Detail inkl. Schritte
- `PATCH /training-plans/{id}` — Titel/Beschreibung/Schritte, archivieren/dearchivieren
- Asset-Create nimmt optional `trainingPlanId`; validiert: Plan gehört zur selben
  Gruppe und ist nicht archiviert (sonst 422)
- Asset-Listen/Detail-Responses liefern `trainingPlanId`/`trainingPlanTitle` mit

Logging: `slog`, `component=trainingplans`, snake_case-Events
(`training_plan_created`, `training_plan_updated`, `training_plan_archived`), keine PII.

## Permissions & Sichtbarkeit

Neu in `internal/permissions/permissions.go`:

| Permission | expert | student |
|---|---|---|
| `training-plans:create` | ✓ | – |
| `training-plans:edit` | ✓ | – |
| `training-plans:read` | ✓ | ✓ |

Autorisierung (Permission + Beziehung, wie bei Assets):

- Create: Owner der Gruppe. Edit/Archivieren: Owner des Plans.
- Read: Mitglied oder Owner der Gruppe.
- Archivierte Pläne: erscheinen in der Liste nur für den Owner (gekennzeichnet)
  und sind nicht mehr in der Upload-Auswahl. Per Direktlink (z. B. Badge an einem
  bereits verknüpften Video) bleiben sie für Mitglieder lesbar, mit „Archiviert"-Hinweis.

**Deployment-Schritt (manuell):** Rolle→Permission liegt in WorkOS (ins JWT gebacken).
Die drei Permissions dort `expert` (alle) und `student` (`read`) zuweisen;
bestehende Nutzer brauchen Re-Login. Nicht in Terraform.

## Frontend (web/dashboard-next)

- **Gruppendetailseite `/groups/:id`:** neuer Abschnitt „Trainingspläne" —
  Liste mit Titel, Schrittanzahl, Anzahl verknüpfter Videos; Skeleton beim Laden;
  Empty-State (Experte: CTA „Ersten Plan anlegen"). Experte sieht archivierte
  (ausgegraut, Badge) und „Plan anlegen".
- **Anlegen/Bearbeiten `/groups/:id/training-plans/new` bzw. `…/:planId/edit`:**
  eigene Seite (Muster `create-group`), dynamische sortierbare Schrittliste — kein Dialog.
- **Plan-Detail `/groups/:id/training-plans/:planId`:** Titel, Beschreibung,
  nummerierte Schritte; CTA „Video zu diesem Plan hochladen" →
  `/upload-video?groupId=…&planId=…` vorbelegt; darunter verknüpfte Videos
  (Reiter: eigene, Experte: alle der Gruppe — bestehende Asset-Sichtbarkeit,
  nach Plan gefiltert); Experte: Bearbeiten/Archivieren.
- **Upload-Seite:** nach Gruppenwahl optionales Select „Trainingsplan (optional)"
  mit aktiven Plänen; vorbelegt per Query-Param; ohne Pläne erscheint das Feld nicht.
- **Video-Detail `/asset/:id`:** Plantitel als klickbarer Badge → Plan-Detailseite.

Durchgängig: Transloco (de/en), `z-*`-Shared-UI und ng-primitives vor Neubau prüfen,
lucide-Icons, Signals/Store-Patterns wie in Nachbarseiten, strict-template-konform.

## Fehlerfälle

- Upload mit archiviertem/fremdem Plan → 422 mit klarer Meldung.
- Plan-Detail ohne Gruppenmitgliedschaft → 404-Verhalten wie bei fehlender Berechtigung;
  archivierte Pläne bleiben für Mitglieder lesbar (mit Hinweis).
- Leere Schrittliste erlaubt, leerer Titel nicht.

## Tests & Verifikation

- Backend-Handler-Tests nach Muster `internal/reviews/handler_test.go`
  (Autorisierungsmatrix Owner/Mitglied/Fremder × create/read/edit).
- sqlc-Queries über bestehende Integrationstest-Schiene.
- Frontend-Spec-Tests für neue Komponenten.
- `make api:build`, `make test:unit`, `make db:sqlc`,
  `make web-next:lint`, `make web-next:build`, `make web-next:test`.
- README-Diagramm um `training_plans` ergänzen.

## Follow-ups (bewusst nicht in v1)

- Bewertungsnote für die Ausführung (z. B. Score beim Finalisieren).
- Status-Tracking pro Reiter/Plan (offen/eingereicht/reviewed) mit Experten-Übersicht.
- Planvorlagen / gruppenübergreifende Wiederverwendung (Duplizieren, globale Turnieraufgaben).
- TTS-Vorlesen der Schritte (Web Speech API als Start, serverseitiges TTS als Ausbau);
  v1-Datenmodell ist dafür durch die strukturierte Schrittliste vorbereitet.
- Datei-Anhänge (z. B. offizielle Turnieraufgaben-PDFs).
