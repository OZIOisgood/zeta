# Design: Rechtstexte für die Strido-Landingpage (mehrsprachig)

> **Kein rechtlicher Rat.** Dieses Dokument und die daraus erzeugten Texte sind eine
> sorgfältige Laien-Aufbereitung auf Basis des Handoffs, des tatsächlichen Code-Stacks
> und anwaltlich geprüfter Vorlagen eines vergleichbaren Projekts. **Vor Veröffentlichung**
> muss ein finaler juristischer Check erfolgen (Anwalt oder etablierter Generator wie eRecht24);
> die Übersetzungen idealerweise durch je einen Muttersprachler/Juristen.

## Kontext

Strido ist eine kostenlose digitale Video-Coaching-Plattform, betrieben von **zwei
Privatpersonen** mit Sitz in **Deutschland** → rechtlich automatisch eine **GbR**.
Für die Landingpage werden die Pflicht-/empfohlenen Rechtsseiten benötigt. Maßgeblich ist
deutsches Recht (§ 5 DDG, DSGVO, TDDDG, BGB) plus die EU-weite **DSA** (Verordnung 2022/2065).

Grundlagen dieses Designs:
- Handoff `rechtstexte-handoff.md` (Pflichtangaben, Rahmenrecht).
- Realer Code-Stack (aus `.env.example`, `infra/terraform`): Datenverarbeiter & Hosting-Region.
- Anwaltlich geprüfte Vorlagen „coach-it" der Dr. Eckhardt + Partner GmbH
  (`E:\Dokumente\Vertragsvorlagen und Verträge`) — **gleiches Geschäftsmodell**
  (Nutzer laden Trainingsvideos hoch, dritte Coaches bewerten + Live-Coaching).

## Getroffene Entscheidungen

| Frage | Entscheidung |
|---|---|
| Ausgabeformat | **Markdown-Text** (keine HTML/Angular-Implementierung) |
| Sprachen | **DE, EN, FR, ES, NL** (4 Dokumente × 5 = 20 Dateien) |
| Rechtsverbindlichkeit | **Deutsche Fassung maßgeblich**, EN/FR/ES/NL = Service-Übersetzung mit Vorrang-Hinweis |
| Pflichtangaben | als `{{PLATZHALTER}}`, vom Menschen auszufüllen |
| Coaching-Modell | **reine Plattform** — Coaching läuft zwischen Nutzer und dritten Coaches; Betreiber stellt nur die Technik |
| Zweite Kontaktmöglichkeit | **Kontaktformular** (Felder spezifiziert; tatsächliche Anbindung NICHT Teil dieses Tasks) |
| Consent-Banner | **nicht nötig** — nur technisch notwendige Session-Cookies (kein Tracking/Analytics im Code gefunden) |
| Ablage | `docs/legal/{de,en,fr,es,nl}/…md` |

## Dateistruktur

Konsistente Slugs je Sprache (gleiche Dateinamen, Ordner = Locale — passt zum i18n-Muster
der App; lokalisierte Überschrift steht jeweils im Dokument als H1):

```
docs/legal/
  de/{imprint,privacy,contact,terms}.md   # H1: Impressum / Datenschutzerklärung / Kontakt / Nutzungsbedingungen
  en/{imprint,privacy,contact,terms}.md   # H1: Legal Notice / Privacy Policy / Contact / Terms of Use
  fr/{imprint,privacy,contact,terms}.md   # H1: Mentions légales / Politique de confidentialité / Contact / Conditions d'utilisation
  es/{imprint,privacy,contact,terms}.md   # H1: Aviso legal / Política de privacidad / Contacto / Condiciones de uso
  nl/{imprint,privacy,contact,terms}.md   # H1: Colofon / Privacybeleid / Contact / Gebruiksvoorwaarden
  README.md                                # Übergabe-Hinweise + Platzhalter-Checkliste + Footer-Snippet
```

Die Übersetzungen sind inhaltsgleich zur deutschen Fassung; rechtliche Fundstellen
(DDG, DSGVO-Artikel, TDDDG, BGB, DSA) bleiben als Referenz erhalten und werden im
Zieltext erläutert.

## Datenverarbeiter laut Code (Grundlage Datenschutzerklärung)

| Dienst | Zweck | Rechtsgrundlage | Drittland? |
|---|---|---|---|
| **Google Cloud** (Cloud Run, Cloud SQL, Cloud Storage), Region `europe-west1` | Hosting, Server-Logs, Datenbank, Aufzeichnungs-Speicher | Art. 6 (1) f / Art. 28 AV | Daten in EU; Konzernmutter USA |
| **WorkOS** | Nutzerkonto, Authentifizierung/Login (ggf. SSO) | Art. 6 (1) b | USA |
| **Mux** | Video-Upload, Transkodierung, Streaming | Art. 6 (1) b | USA |
| **Agora** | Live-Coaching (Echtzeit-Audio/Video); optionale Aufzeichnung → GCS (EU) | Art. 6 (1) b | USA (ggf. weiterer Nexus) |
| **Resend** | Transaktions-E-Mails (Benachrichtigungen, Buchungsmails, Kontaktformular) | Art. 6 (1) b / f | USA |
| **OpenRouter, LLC** | KI-gestützte sprachliche Verbesserung der Experten-Bewertungen (Feedback-Texte) | Art. 6 (1) b / f | USA + nachgelagerte Modellanbieter |
| **Expo** | Push-Benachrichtigungen (nur bei Opt-in) | Art. 6 (1) a / f | USA |
| **Kontaktformular** (intern, Versand via Resend) | Bearbeitung von Anfragen | Art. 6 (1) a / b / f | s. Resend |

→ Eigener Abschnitt **Drittlandübermittlung** (Art. 44 ff.): EU-US Data Privacy Framework
soweit zertifiziert, sonst Standardvertragsklauseln (Art. 46).
→ Kein Analytics/Tag-Manager/Pixel/externe Fonts im Frontend gefunden → **kein Consent-Banner**;
nur technisch notwendige Cookies (§ 25 Abs. 2 TDDDG).
> OpenRouter-Scope (welche Texte genau gesendet werden) beim Ausfüllen final prüfen.

## Die vier Dokumente

### 1. Impressum (`imprint.md`) — § 5 DDG
- GbR-Bezeichnung `{{GBR_BEZEICHNUNG}}`, beide Klarnamen `{{NAME_1}}`/`{{NAME_2}}`
- Ladungsfähige Anschrift `{{ANSCHRIFT}}` (Straße + Hausnr., kein Postfach)
- E-Mail `{{EMAIL}}`; zweite Kontaktmöglichkeit: **Kontaktformular** (`{{DOMAIN}}/kontakt`)
- Vertretung: beide Gesellschafter **gemeinsam vertretungsberechtigt**
- Umsatzsteuer-ID/Handelsregister: **entfällt** (ausdrücklich vermerkt)
- **DSA Art. 11 — Kontaktstelle für Behörden:** `{{EMAIL_DSA}}` (Default = `{{EMAIL}}`), Sprachen Deutsch/Englisch
- Verbraucherschlichtung (§ 36 VSBG): kurzer Hinweis, nicht teilzunehmen
- **Bewusst weggelassen:** OS-Plattform-Link (seit 20.07.2025 abgeschaltet); § 18 Abs. 2 MStV
  (nur bei journalistisch-redaktionellen Inhalten → Annahme: nein; als Kommentar markiert)

### 2. Datenschutzerklärung (`privacy.md`) — DSGVO + TDDDG
1. Verantwortliche: **gemeinsam Verantwortliche (Art. 26)**, beide Gesellschafter (Impressumsdaten)
2. Allgemeines / Rechtsgrundlagen (Art. 6 Überblick)
3. Hosting & Server-Logs — Google Cloud, Region EU `europe-west1`, AV nach Art. 28
4. Nutzerkonto & Authentifizierung — WorkOS
5. Video-Upload & -Streaming — Mux
6. Live-Coaching & Aufzeichnung — Agora (Aufzeichnung in GCS/EU, nur im Nutzerbereich)
7. Transaktions-E-Mails — Resend
8. KI-Textverbesserung — OpenRouter (Hinweis: keine sensiblen Daten eingeben)
9. Push-Benachrichtigungen — Expo (nur bei Opt-in)
10. Kontaktformular — Felder Name/E-Mail/Nachricht, Zweck, Speicherdauer
11. Cookies & lokale Speicher — nur notwendig, § 25 Abs. 2 TDDDG, **kein Consent-Banner**
12. Drittlandübermittlung — Art. 44 ff. (DPF / SCC)
13. Speicherdauer (allgemein + je Kategorie)
14. Betroffenenrechte — Art. 15–21, Widerruf Art. 7 (3)
15. Beschwerderecht bei `{{AUFSICHTSBEHOERDE}}` (zuständig nach Bundesland)
16. Kein Datenschutzbeauftragter erforderlich
17. Stand: `{{STAND_DATUM}}`

### 3. Kontakt (`contact.md`)
- Einleitung, E-Mail `{{EMAIL}}`
- Kontaktformular-Felder: **Name, E-Mail, Nachricht** + Pflicht-Checkbox „Datenschutzerklärung zur Kenntnis genommen"
- Verweis auf Datenschutzerklärung und Impressum
- Hinweis: Meldung rechtswidriger Inhalte → Verweis auf das Melde-/Abhilfeverfahren (Nutzungsbedingungen)

### 4. Nutzungsbedingungen / Haftung (`terms.md`)
Skelett der anwaltlich geprüften coach-it-Vorlage, von GmbH/entgeltlich auf GbR/kostenlos reduziert:
1. Geltungsbereich & Anbieter (GbR), Begriffe (Nutzer, Coach/Experte, Inhalte)
2. **Vertragsgegenstand:** unentgeltliche Bereitstellung der Infrastruktur; **ausdrücklich nicht** die Coaching-Leistung (läuft zwischen Nutzer und Coach)
3. Registrierung & Nutzerkonto (über WorkOS AuthKit, E-Mail-Verifizierung durch WorkOS; Minderjährige nur mit Einwilligung Erziehungsberechtigter; Einladungscode-Phase möglich)
4. Bereitstellung & Verfügbarkeit („as is", keine Gewähr für ununterbrochene Verfügbarkeit/Wartung)
5. Nutzungsrechte an der Software (einfach, nicht übertragbar)
6. Rechte an hochgeladenen Inhalten (Nutzer behält Rechte, räumt einfache Betriebslizenz ein)
7. Pflichten des Nutzers & zulässige Inhalte (keine rechtswidrigen Inhalte/Rechte Dritter)
8. Datensicherung obliegt dem Nutzer
9. **Inhalte und Moderation (DSA Art. 14)** — Entfernung rechtswidriger Inhalte, Kontosperre, Verfahren
10. **Melde- & Abhilfeverfahren (DSA Art. 16)** — Vorlage aus dem Dr.-Eckhardt-Meldeformular: Meldung über Kontakt/Formular (Name/E-Mail optional, URL/Kennung, Beschreibung, Art des Verstoßes, Richtigkeitserklärung), Eingangsbestätigung, Prüfung, Mitteilung; **Kontaktstelle für Nutzer (DSA Art. 12)** `{{EMAIL}}`, Sprachen DE/EN
11. **Haftung** — Trennung Plattform/Coaching (keine Haftung für Coaching-Inhalte Dritter); Host-Privileg §§ 7–10 DDG; Beschränkung auf **Vorsatz + grobe Fahrlässigkeit**; **unbeschränkt** für Leben/Körper/Gesundheit & Vorsatz (§ 309 BGB); Anlehnung §§ 521/599 BGB (Unentgeltlichkeit); keine pauschale Freizeichnung
12. Freistellung (Nutzer stellt Anbieter von Drittansprüchen wegen eigener Inhalte frei)
13. Laufzeit, Kündigung, Kontolöschung (jederzeit; Datenlöschung)
14. Änderungen der Nutzungsbedingungen
15. Schlussbestimmungen (deutsches Recht, Gerichtsstand soweit zulässig, Salvatorische Klausel, Stand)

## Footer-Snippet
Auf jeder Seite (inkl. Landingpage) klar beschriftete Links: **Impressum · Datenschutz · Kontakt · Nutzungsbedingungen** (Markdown- und HTML-Variante in `README.md`).

## Platzhalter (vom Menschen auszufüllen)
`{{GBR_BEZEICHNUNG}}` · `{{NAME_1}}` · `{{NAME_2}}` · `{{ANSCHRIFT}}` · `{{EMAIL}}` ·
`{{EMAIL_DSA}}` (optional, Default `{{EMAIL}}`) · `{{DOMAIN}}` · `{{AUFSICHTSBEHOERDE}}` ·
`{{STAND_DATUM}}`

## Verifikation
- Jede `{{…}}`-Stelle existiert konsistent in allen 5 Sprachen; keine Restplatzhalter aus der Vorlage.
- Kein Abschnitt beschreibt einen Dienst/Cookie/Tracking, den der Code nicht nutzt.
- Jede Übersetzung enthält den Vorrang-Hinweis „im Zweifel gilt die deutsche Fassung".
- Footer-Links auf allen Seiten vorhanden; DSA-Kontaktstellen (Art. 11 im Impressum, Art. 12 in den NB) gesetzt.
- `README.md` listet die offenen Menschen-Aufgaben aus dem Handoff Abschnitt 4.

## Nicht Teil dieses Tasks / Follow-ups
- Tatsächliche Implementierung der Seiten/Routen und des Kontaktformular-Backends.
- Finaler juristischer Review + muttersprachliche Prüfung der Übersetzungen.
- Menschen-Aufgaben (Handoff §4): ladungsfähige Anschrift festlegen, Arbeitsvertrags-Nebentätigkeit prüfen,
  eGbR-Eintragung erwägen, Rechtsform bei Wachstum überdenken.
- OpenRouter-Datenscope final verifizieren (welche Texte gesendet werden).

## Review-Korrekturen (Multi-Agent-Review, 2026-06-14)

Nach gründlichem Review (16 Agents, adversariale Verifikation; 4 Befunde bestätigt) umgesetzt und in alle 5 Sprachen gespiegelt (DE maßgeblich):

- **H1 — `terms.md` Ziffer 14:** Zustimmungsfiktion bei Änderungen war in dieser Breite voraussichtlich unwirksam (BGH XI ZR 26/20; §§ 307, 308 Nr. 5 BGB). Neu gefasst als 14.1–14.4: enges, zumutbares Änderungsrecht; aktive Zustimmung bei Eingriffen in den Leistungskern; keine Fiktion aus bloßer Weiternutzung; kostenloses Kündigungsrecht.
- **H2/H3 — `privacy.md`:** Neuer Abschnitt **11 „Empfänger und Kategorien von Empfängern"** (Art. 13 Abs. 1 lit. e DSGVO) — Coaches als eigenständig Verantwortliche sowie Sichtbarkeit von Anzeigename/Aktivität gegenüber anderen Nutzern (inkl. Push, verifiziert an `internal/push/message.go`). Folgesektionen 11–16 → 12–17 umnummeriert, Drittland-Querverweis → Ziffer 13.
- **M1 — `terms.md` 11.3a:** Hilfsweise Kardinalpflichten-Haftungsbegrenzung, falls die §§ 521/599-Analogie nicht greift.

Offen gelassen für menschliche/juristische Prüfung: DSA-Status (Hosting-Dienst vs. „Online-Plattform", N1); endgültige Bewertung der §§ 521/599-Analogie; Kontaktformular-Backend als zweite Kontaktmöglichkeit (N2).
