# Audit-Trail — Design Spec

- **Datum:** 2026-06-10
- **Status:** Design abgestimmt, bereit für Implementierungsplan
- **Zweck:** Rechenschaft/Forensik (A) + DSGVO-Nachvollziehbarkeit (B)

## Kontext

Zeta braucht ein Auditlog, um nachvollziehbar zu machen, **wer wann was** getan hat
— belastbar für Streitfälle (Coach ↔ Student), Missbrauchsnachweis und
DSGVO-Rechenschaft. Es ist **kein** Produkt-Feature (kein End-User-Verlauf) und
**kein** Ops-Debugging-Tool. Daraus folgt: hartes, unveränderliches, append-only
Trail mit definierter Aufbewahrungsfrist.

Bestehende Architektur, die das Design trägt:

- Actor-Kontext liegt via JWT in jedem Request: `auth.UserContext`
  (`internal/auth/middleware.go`) — ID, Email, Name, Role, Permissions.
- DB-Zugriff über **sqlc + pgx**; `Queries.WithTx(tx)` (`internal/db/db.go`)
  erlaubt transaktionskonsistentes Schreiben.
- Migrations im `golang-migrate`-Stil unter `db/migrations/`.
- `request_id` wird bereits in der Logger-Middleware erzeugt
  (`internal/logger/middleware.go`).
- **Befund:** Handler halten aktuell nur das `db.Querier`-Interface, **keinen**
  Pool. Für atomare Audit-Schreibvorgänge müssen die betroffenen Handler einen
  `*pgxpool.Pool` erhalten und auf Transaktionen umgestellt werden.

## Grundsatzentscheidungen

| Frage | Entscheidung |
|---|---|
| Zweck | A (Forensik) + B (DSGVO-Rechenschaft) |
| Schreib- vs. Lesezugriffe | **Nur Mutationen** (create/update/delete). Kein Read-Logging. |
| PII-Strategie | **Diszipliniertes B (Industriestandard):** `actor_id` + erfasstes Actor-Label (Point-in-Time), before/after mit minimiertem PII. |
| DSGVO-Erasure | Greift auf **Live-Daten**, nicht auf den Trail. Trail bleibt unter Rechtsgrundlage (Art. 17(3)) bis Fristablauf. |
| Aufbewahrung | **3 Jahre Default**, per `AUDIT_RETENTION_DAYS` konfigurierbar |
| Architektur | Application-level, **in derselben DB-Transaktion** wie die Mutation. Kein Trigger-Capture, kein Outbox. |
| Unveränderlichkeit | DB-Trigger blockt UPDATE **und** DELETE; **monatliche Partitionierung** ab Start. |

### Warum Application-level statt Trigger/pgaudit/Outbox

- **Trigger-Capture** ist für sqlc unsichtbar und kann den Actor („wer") nur über
  umständliche Session-Variablen sehen.
- **pgaudit** loggt Statements, nicht fachliche Ereignisse.
- **Transactional Outbox** wäre die Event-getriebene Steigerung — für den aktuellen
  Reifegrad Overkill.
- Application-level fügt sich nativ in `Queries.WithTx(tx)` ein und hat den Actor
  bereits im Kontext.

## Datenmodell — `audit_events`

Monatlich **RANGE-partitioniert** über `occurred_at`. PK enthält den
Partitionsschlüssel: `(id, occurred_at)`.

| Spalte | Typ | Zweck |
|---|---|---|
| `id` | uuid | Teil des PK |
| `occurred_at` | timestamptz, default now() | wann; Partitionsschlüssel |
| `actor_id` | **text**, null | wer (FK-frei, retention-unabhängig); null bei System |
| `actor_type` | text not null | `user` / `system` |
| `actor_label` | text, null | Point-in-Time Name/Email des Actors |
| `action` | text not null | stabiler Verb, z. B. `booking.cancelled` |
| `resource_type` | text not null | `booking`, `review`, `group`, … |
| `resource_id` | **text**, null | betroffene Entität |
| `group_id` | **text**, null | Sekundär-Scope für „in welcher Gruppe"-Abfragen |
| `old_values` | jsonb, null | vorher (PII-minimiert) |
| `new_values` | jsonb, null | nachher (PII-minimiert) |
| `metadata` | jsonb, null | `request_id`, `ip`, `user_agent` |

**Indizes:** `(resource_type, resource_id, occurred_at desc)`,
`(actor_id, occurred_at desc)`, `(group_id, occurred_at desc)`.
(Der Partitionsschlüssel deckt zeitbasierte Retention-Scans ab.)

**Kein** FK von `actor_id`/`resource_id` auf Live-Tabellen — der Trail muss
unabhängig von Löschungen der Live-Daten bestehen bleiben.

> ⚠️ **`actor_id` / `resource_id` / `group_id` sind bewusst `TEXT`, nicht `UUID`** —
> **nicht** auf `UUID` „korrigieren". Benutzer-IDs kommen von WorkOS und sind
> String-IDs der Form `user_01H…` (vgl. `owner_id`, `expert_id`,
> `user_groups.user_id`, alle `TEXT`). `resource_id` hält je nach Entität eine
> UUID-als-Text **oder** eine WorkOS-ID; `TEXT` ist der gemeinsame Nenner. Ein
> Wechsel auf `UUID` würde alle Actor- und Profil-Events brechen.

## Event-Taxonomie

Stabile Namen, zentral als Konstanten in `internal/audit` (analog
`permissions.go`). Stabilität ist Pflicht — Namen sind Teil des Trail-Vertrags.

| resource_type | actions |
|---|---|
| `booking` | `booking.created`, `booking.cancelled`, `booking.rescheduled` |
| `coaching_session` | `coaching_session.conducted` |
| `recording` | `recording.created`, `recording.deleted` |
| `review` | `review.created`, `review.updated`, `review.deleted` |
| `group` | `group.created`, `group.updated`, `group.deleted` |
| `group_membership` | `group_membership.added`, `group_membership.removed`, `group_membership.left` |
| `group_invite` | `group_invite.created`, `group_invite.accepted`, `group_invite.revoked` |
| `asset` | `asset.deleted` |
| `video` | `video.deleted` |
| `profile` | `profile.updated` |

## Schreibpfad

Neues Paket `internal/audit` mit einem `Recorder`:

```go
type Event struct {
    Action       string
    ResourceType string
    ResourceID   string         // "" → NULL (UUID-als-Text oder WorkOS-ID)
    GroupID      string         // "" → NULL
    OldValues    any            // wird zu JSONB serialisiert, PII-minimiert
    NewValues    any
}

// Record schreibt das Event innerhalb der übergebenen Transaktion.
func (r *Recorder) Record(ctx context.Context, tx pgx.Tx, e Event) error
```

- **Actor automatisch** aus `auth.GetUser(ctx)`. Fehlt der Nutzer (Webhook/Job)
  → `actor_type = system`, `actor_id = null`.
- **`actor_label`** Point-in-Time aus `UserContext` (Name bzw. Email).
- **`metadata` automatisch** aus dem Kontext. Dafür eine kleine
  **Audit-Context-Middleware**, die `request_id` (bereits vorhanden), `ip` und
  `user_agent` als auslesbare Context-Werte ablegt — kein Boilerplate pro Handler,
  kein Vergessen.
  - ⚠️ **IP ist personenbezogen.** Erfassung daher **opt-in** über
    `AUDIT_CAPTURE_IP` (Default **aus**). Forensisch wertvoll für Missbrauchs-
    erkennung (A), aber für Pre-Release nicht zwingend — erst aktivieren, wenn
    der Bedarf konkret ist. `request_id`/`user_agent` bleiben immer an.
- **Atomarität:** Audited Handler bekommen den `*pgxpool.Pool` injiziert. Ablauf:
  `pool.Begin` → `q.WithTx(tx)` für **Mutation und** Audit-Insert → `Commit`.
  Mutation und Audit-Zeile committen gemeinsam oder gar nicht.

### Implementierungsaufwand (bewusst benannt)

Der Hauptaufwand ist der **Transaktions-Umbau der ~12 betroffenen Handler** von
„`db.Querier`-Interface" auf „`*pgxpool.Pool` + Transaktion". Das ist die
Voraussetzung dafür, dass der Trail nie von der Realität abdriften kann.

## Unveränderlichkeit & Retention

- **Trigger** `BEFORE UPDATE OR DELETE` auf `audit_events` wirft immer →
  Zeilen sind weder editier- noch zeilenweise löschbar (harter append-only Trail).
- App besitzt **nur** eine `CreateAuditEvent`-Insert-Query; keine UPDATE/DELETE-Query.
- **Retention** läuft über **`DROP` abgelaufener Monatspartitionen** (DDL), nicht
  über `DELETE` (DML) — daher kann DELETE komplett blockiert bleiben.
- **Frist konfigurierbar** über `AUDIT_RETENTION_DAYS` (Default `1095` = 3 Jahre).
  Bewusst kein hartcodierter Wert: Für Pre-Release kann die Frist kurz gesetzt
  werden; der Partitions-Mechanismus bleibt identisch. Die 3 Jahre sind nur ein
  vertretbarer Default, keine Festlegung.
- **Monatlicher Wartungsjob:** legt die kommende Partition an und droppt
  abgelaufene. (Alternativ `pg_partman`; Entscheidung im Implementierungsplan.)

## DSGVO-Position

- Audit-/Sicherheits-Logs als **berechtigtes Interesse / rechtliche Pflicht**
  (Art. 17(3) DSGVO — Geltendmachung von Rechtsansprüchen).
- Ein Löschbegehren betrifft **Live-Daten**, nicht den Trail.
- PII im Payload wird minimiert (keine Tokens, keine vollständigen Profile/E-Mail-
  Bodies); sensible Felder werden vor dem Serialisieren herausgefiltert.
- `ip` ist opt-in (s. o.); `actor_label` ist der bewusst in Kauf genommene
  PII-Anteil (Point-in-Time-Name/Email), der den forensischen Wert erst herstellt.

### Benutzer-Löschung & Erasure (bewertete Entscheidung + Restrisiko)

> Vom Kollegen aufgeworfen: „Bei Benutzerlöschung müssten wir deren Daten evtl.
> auch aus dem Audit entfernen — das ist problematisch."

Das ist der inhärente Zielkonflikt von A (unveränderlich) + B (DSGVO). Position:

- **Standardfall:** Wird ein Nutzer gelöscht, werden seine **Live-Daten** gelöscht.
  Der Trail bleibt unter der Rechtsgrundlage Art. 17(3) bestehen. Übrig bleiben
  dort nur `actor_id` (WorkOS-ID, pseudonym), `actor_label` (Name zum Zeitpunkt)
  und PII-minimierte Snapshots. Das ist die bewusst gewählte, verteidigbare Linie.
- **Restrisiko / ehrlich benannt:** Verlangt eine Rechtsmeinung doch die *harte*
  Entfernung aus dem Trail, kollidiert das mit der Unveränderlichkeit. Durch
  Partitionierung **und** geblockten DELETE ist zeilenweises Löschen unmöglich —
  das ist gewollt, macht aber gezielte Erasure einzelner Personen unmöglich.
- **Eskalations-Optionen, falls je nötig (heute nicht gebaut, YAGNI):**
  - **Crypto-Shredding** des `actor_label`/PII-Payloads: pro-Nutzer-Key, bei
    Löschung Key vernichten → Klartext unwiederbringlich, Trail-Struktur intakt.
  - Oder: `actor_label`/Payload-PII von vornherein **weglassen** und nur
    `actor_id` führen (rein pseudonym) — schwächere Lesbarkeit, einfachste DSGVO.
- **Empfehlung jetzt:** Standardlinie dokumentieren, Restrisiko mit Rechts-/
  Datenschutz-Sicht klären, **bevor** die Domänen-Wiring-Pläne PII in Snapshots
  schreiben. Bis dahin Snapshots maximal datensparsam halten.

## Außer Scope

- Lesezugriffe / Read-Logging
- Verfügbarkeiten / blockierte Slots (Rauschen)
- **WorkOS-Rollen-/Berechtigungsänderungen** — liegen in WorkOS, die Go-API sieht
  sie nie. Bewusst ausgeklammert; WorkOS hat eigene Audit-Logs. Optional später
  per WorkOS-Webhook nachrüstbar.
- Asset-Erstellung / Upload-Fortschritt
- Report-Generierung (wäre ein Read)
- Jegliche End-User-UI

## Tests

- **Unit (pro Event):** korrekte `action`, korrekter Actor (inkl. System-Fall),
  korrekte `resource_id`.
- **Integration:**
  - `UPDATE`/`DELETE` auf `audit_events` schlägt fehl (Trigger).
  - Atomarität: Mutation-Rollback ⇒ kein Audit-Event; Audit-Fehler ⇒
    Mutation-Rollback.
  - Retention: `DROP` einer abgelaufenen Partition entfernt nur diese.

## Follow-ups / offene Punkte für den Implementierungsplan

- Genaue Liste der ~12 betroffenen Handler + Reihenfolge des Tx-Umbaus.
- Wartungsjob: eigener Scheduler-Tick vs. `pg_partman`.
- `.env.example` / Terraform-Wiring prüfen, falls Retention-Konfig oder Job-Cron
  hinzukommt.
- README-Diagramme aktualisieren (neue Tabelle / Datenfluss).
