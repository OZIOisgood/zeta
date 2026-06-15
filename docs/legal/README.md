# Strido — Rechtstexte für die Landingpage

> **Kein rechtlicher Rat.** Diese Texte sind eine sorgfältige Laien-Aufbereitung auf Basis des tatsächlichen Code-Stacks und anwaltlich geprüfter Vorlagen eines vergleichbaren Projekts. **Vor Veröffentlichung muss ein finaler juristischer Check erfolgen** (Anwalt oder ein etablierter Generator wie eRecht24). Die Übersetzungen EN/FR/ES/NL sollten zusätzlich je von einer muttersprachlichen bzw. juristischen Person geprüft werden.

## Struktur

```
docs/legal/
  de/  imprint.md  privacy.md  contact.md  terms.md   ← rechtlich maßgeblich
  en/  imprint.md  privacy.md  contact.md  terms.md
  fr/  imprint.md  privacy.md  contact.md  terms.md
  es/  imprint.md  privacy.md  contact.md  terms.md
  nl/  imprint.md  privacy.md  contact.md  terms.md
```

- **Die deutsche Fassung ist die rechtlich verbindliche.** EN/FR/ES/NL sind Serviceübersetzungen; jede enthält oben einen Vorrang-Hinweis auf die deutsche Fassung.
- Die Dateinamen sind je Sprache gleich (`imprint/privacy/contact/terms`); die lokalisierte Überschrift steht im Dokument:

| Datei | DE | EN | FR | ES | NL |
|---|---|---|---|---|---|
| `imprint` | Impressum | Legal Notice | Mentions légales | Aviso legal | Colofon |
| `privacy` | Datenschutzerklärung | Privacy Policy | Politique de confidentialité | Política de privacidad | Privacybeleid |
| `contact` | Kontakt | Contact | Contact | Contacto | Contact |
| `terms` | Nutzungsbedingungen | Terms of Use | Conditions d'utilisation | Condiciones de uso | Gebruiksvoorwaarden |

## Platzhalter — vor Go-Live ausfüllen

In **allen** Dateien (alle Sprachen) ersetzen:

| Platzhalter | Bedeutung |
|---|---|
| `{{GBR_BEZEICHNUNG}}` | Bezeichnung der GbR, z. B. „Vorname Nachname und Vorname Nachname GbR" |
| `{{NAME_1}}`, `{{NAME_2}}` | Vollständige Vor- und Nachnamen beider Gesellschafter |
| `{{ANSCHRIFT}}` | Ladungsfähige Anschrift (Straße + Hausnr., PLZ, Ort — kein Postfach) |
| `{{EMAIL}}` | Haupt-Kontakt-E-Mail |
| `{{EMAIL_DSA}}` | Behörden-Kontaktstelle (Art. 11 DSA); Standard = `{{EMAIL}}` |
| `{{DOMAIN}}` | Domain ohne Protokoll, z. B. `strido.app` |
| `{{AUFSICHTSBEHOERDE}}` | Zuständige Datenschutz-Aufsichtsbehörde nach Bundesland des Sitzes (Name + ggf. Anschrift/URL) |
| `{{STAND_DATUM}}` | Datum der Veröffentlichung, z. B. „14. Juni 2026" |

> Vor Veröffentlichung prüfen, dass kein `{{` mehr in den Dateien steht.

## Footer-Snippet (auf jeder Seite, inkl. Landingpage)

Pflicht-Links: Impressum + Datenschutz. Empfohlen zusätzlich: Kontakt + Nutzungsbedingungen.

Markdown (DE):
```markdown
[Impressum](/impressum) · [Datenschutz](/datenschutz) · [Kontakt](/kontakt) · [Nutzungsbedingungen](/nutzungsbedingungen)
```

HTML (DE):
```html
<nav aria-label="Rechtliches">
  <a href="/impressum">Impressum</a> ·
  <a href="/datenschutz">Datenschutz</a> ·
  <a href="/kontakt">Kontakt</a> ·
  <a href="/nutzungsbedingungen">Nutzungsbedingungen</a>
</nav>
```

Die internen Links in den Texten nutzen je Sprache lokalisierte Pfade (DE `/impressum` `/datenschutz` `/kontakt` `/nutzungsbedingungen`; EN `/imprint` `/privacy` `/contact` `/terms`; FR `/mentions-legales` `/confidentialite` `/contact` `/conditions-utilisation`; ES `/aviso-legal` `/privacidad` `/contacto` `/condiciones-uso`; NL `/colofon` `/privacybeleid` `/contact` `/gebruiksvoorwaarden`). Pfade an das tatsächliche Routing anpassen oder die Markdown-Dateien direkt verlinken.

## Stack-Grundlage (woraus die Datenschutzerklärung abgeleitet ist)

Aus dem Code ermittelt: Hosting Google Cloud (`europe-west1`, EU), Auth WorkOS/AuthKit, Video Mux, Live-Coaching Agora (+ GCS-Aufzeichnung), E-Mail Resend, KI-Textverbesserung OpenRouter (nur Experten-Bewertungen), Push Expo. Kein Analytics/Tracking → **kein Cookie-Banner** nötig.

## Noch offene Aufgaben (Mensch)

- [ ] Platzhalter ausfüllen (Tabelle oben), Stand-Datum setzen.
- [ ] **Finaler juristischer Review** vor Go-Live; Übersetzungen muttersprachlich prüfen lassen.
- [ ] Ladungsfähige Anschrift festlegen (Wohn- vs. separate Adresse).
- [ ] **Minderjährige:** Die Texte erlauben Minderjährige *mit Einwilligung der Erziehungsberechtigten*. Der Signup-Flow muss diese Einwilligung tatsächlich abfragen/dokumentieren (Entwicklungsaufgabe). Alternativ Altersgrenze 16/18 wählen und Texte anpassen.
- [ ] Anbieter-Firmierungen gegen die aktuellen AV-Verträge/DPAs prüfen (insb. WorkOS, Mux — nicht webverifiziert).
- [ ] OpenRouter-Datenscope final bestätigen (welche Texte gesendet werden).
- [ ] Kontaktformular technisch anbinden (Versand via Resend) inkl. Pflicht-Checkbox „Datenschutz zur Kenntnis genommen".
- [ ] Arbeitsvertrags-Nebentätigkeitsklausel prüfen; eGbR-Eintragung erwägen; bei Wachstum haftungsbeschränkte Rechtsform (UG/GmbH) prüfen.

## Quelle / Design

Design-Spec: [`.agents/plans/20260614150451_rechtstexte_landingpage_design.md`](../../.agents/plans/20260614150451_rechtstexte_landingpage_design.md)
