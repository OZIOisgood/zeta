# Parity-Altlasten-Audit: vollständiger Mock-Abgleich (3 Reviewer parallel)

## Kontext

Nach dem Fund der nie abgeglichenen Verfügbarkeits-Formulare (9c4ec81): systematischer Diff aller Handoff-Referenzen (screens/screens2/screens3.jsx) gegen die App. Kalibriert: Wording (Web-geführt), Type-Scale, Native-Chrome, Farben und dokumentierte Schema-Lücken gelten nicht als Findings. Availability ausgenommen (bereits gefixt).

## Muster-Beleg

Betroffene Dateien verweisen in Kommentaren auf Web-Vorlagen statt auf den Mock: login.tsx („the web card"), group-card.tsx + group/[id]/preferences.tsx („phase4"-Keys), stat-card.tsx („counterpart of the web home page stat cards"), z-danger-zone-card.tsx, z-avatar-input.tsx (Inline-Modus), notification-row.tsx (zitiert notification-list.component.ts).

## Findings nach Screen (H=hoch, M=mittel, N=niedrig)

**Gruppen-Einstellungen** (group/[id]/preferences.tsx) — größter Block:
- H: „Speichern" als Full-width-Button unten statt Header-Textaktion (Mock-Konvention: Edit=Header-Save, Create=Footer-Button; preferences.tsx macht es vor).
- H: Avatar als beschriftetes Inline-Feld IN der Card + Reihenfolge Name→Avatar→Beschreibung; Mock: zentrierter tappbarer Avatar ÜBER der Card, Card nur Name→Beschreibung.
- H: Danger-Zone: Mock = eine Card mit danger-Border und ZWEI Listenzeilen (Verlassen/Löschen, beide sichtbar); App = XOR aus ZDangerZoneCard (Web-Anatomie, Full-width-Button) bzw. nacktem Danger-Button.
- M: Intro-Summary-Absatz ohne Mock-Pendant.

**Gruppe anlegen** (group/create.tsx):
- H: Avatar-Picker im Web-Inline-Layout (Avatar+Button+Hint) statt Mock-Picker (zentrierter 88px-Kreis, tappbar, Leerzustand = dashed+Kamera+Plus-Badge). `centered`-Variante von ZAvatarInput existiert, hat aber keinen Leerzustand.
- N: Optional-Hint fehlt, Submit-Gating (disabled bis valide) fehlt, rows 4 statt 3, Asterisk- statt Hint-Konvention.

**Gruppen-Liste** ((tabs)/groups/index.tsx + group-card.tsx):
- M: Subtitle = Beschreibung mit „phase4.noDescription"-Platzhalter (1:1 Web); Mock: „N Mitglieder" — API hat kein member_count → Backend-gated, aber undokumentiert.
- M: iOS ohne inset-grouped Wrapper — eckige ZListItem-Zellen frei im Screen (Zellen-Kontrakt verlangt ZCard-Clipping; Profile macht es richtig).
- N: Trailing-Chevron fehlt.

**Reports** (stat-card.tsx):
- H: StatTile-Anatomie invertiert — App nutzt die Web-Home-Kachel (Label links, ungeboxtes Icon rechts), Mock: IconTile oben → Count → Label → Badge-Footer.
- N: „Heute"-Button ohne Mock-Pendant.

**Invite** (invite.tsx):
- H: Confirm-Phase als horizontale Zeilen-Card statt zentriertem Hero (Avatar 72, Name 21/800, Meta, Beschreibungs-Card, Join mit Check-Icon, Ablehnen secondary statt ghost). Meta/Beschreibung API-gated (InvitationInfo schlank), Hero-Layout selbst nicht.
- M: Scanner-Viewport 280px-fix statt quadratisch, ohne Scan-Rahmen-Overlay und sichtbare Caption.

**Login** (login.tsx):
- H: „Konto erstellen"-Button (tonal, zweiter CTA) fehlt — evtl. bewusst (AuthKit-Hosted-Signup), aber nirgends dokumentiert.
- M: Brand-Block als kleine Zeile IN der Card statt zentrierter Spalte darüber (Kommentar zitiert „the web card"; Login ist die Brand-Canvas).

**Benachrichtigungen** (notification-row.tsx):
- M: Icon-Tile zeigt Typ-Semantik-Töne (Web) statt Ungelesen-Zustand (Mock: accent-container wenn ungelesen, surface wenn gelesen) + abweichende Glyphen.
- N: Count auf beiden Segmenten statt nur „Ungelesen".

**Buchen** (book.tsx):
- M: „Erste*r verfügbare*r"-Auto-Assign-Option fehlt (evtl. Backend-gated: Slots verlangen expertId — dann als Deferral dokumentieren).
- M: Date-Rail rendert nur Tage MIT Slots (ZDateRail kennt kein disabled) — Kalender-Kontinuität und „keine freien Termine"-Zustand unerreichbar.
- M: Stepper scrollt mit statt fixiert unter dem Header.
- N: Step-Reihenfolge Who→What (sachlich begründet, undokumentiert), PickRow ohne Accent-Ring, Rail nicht full-bleed, CTA-Icons fehlen (auch Upload).

**Kleinkram quer:** Home-Hero „Beitreten" ohne flex-1 (M), Home 4 statt 2 Video-Teaser (N), Profil-Hero ohne „· Gruppe"-Zweitzeile (N), Seek-Chip ohne showCheck=false → Android-Häkchen (N), Upload-Summary nutzt falschen Key als „Dateien"-Label (N, eigentlich Bug), Sprache als Such-Combobox statt Select (M), GroupDetail-Invite-Ergebnis gestapelt + downloadQr tonal statt secondary (N).

**Konform (nachweislich nachgezogen):** Home-Struktur, Videos, Asset-Detail komplett (Player/Kommentare/Composer/Part-Rail), Sessions-Liste, Profil, Upload-Steps, Booking-Grundgerüst, GroupDetail-Struktur, Preferences/Persönliche Daten.

## Empfohlene Fix-Reihenfolge

1. Gruppen-Paket (Einstellungen: Header-Save, Avatar-Position, Danger-Zone-Zeilen; Create: Mock-Picker inkl. Leerzustand in ZAvatarInput centered; Liste: iOS-Gruppierung + Chevron).
2. Reports-StatTile + Invite-Confirm-Hero + Scanner-Overlay.
3. Login (Brand-Block; „Konto erstellen" nach Klärung ob gewollt).
4. Booking-Trio (Rail-disabled-Tage via ZDateRail-Erweiterung, fixer Stepper, any-Expert klären) + Notification-Tile-Zustand.
5. Nits gesammelt (Chevron, flex-1, Teaser-Zahl, showCheck, Icons, Upload-Label-Key, Sprache-Select …).
6. Backend-Tickets/Deferrals dokumentieren: group.member_count, InvitationInfo-Meta, any-Expert-Slots.
