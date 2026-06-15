# Handoff: Strido — Landingpage v2 (Reitsport)

## Overview
Marketing-Landingpage für **Strido**, eine Video-Coaching-Plattform mit Reitsport-Fokus (funktioniert aber für jeden Sport mit visuellem Technik-Feedback). Reiter laden Trainingsvideos hoch und erhalten sekundengenaues Feedback; alternativ buchen sie Live-1:1-Coaching, dessen Aufzeichnung archiviert und nachträglich kommentiert werden kann. Der Dienst ist **komplett kostenlos**.

Die Seite umfasst: Hero, „Kostenlos"-Band, „Zwei Wege" (asynchron/live), Feature-Sektionen (Feedback, Live-Coaching, Buchung, Stall & Gruppen, Fortschritt/Reports), „Für wen" (Reiter/Trainer), Disziplinen & Sportarten, Roadmap, Testimonials, Abschluss-CTA und Footer. Dazu drei Unterseiten (Impressum, Datenschutz, Kontakt).

Zusätzlich: **Sprachumschalter (DE/EN/FR/NL)** im Header und ein **Tweaks-Panel** (nur Design-Werkzeug, in Produktion weglassen).

## About the Design Files
Die Dateien in diesem Bundle sind **Design-Referenzen in HTML/CSS** — Prototypen, die Aussehen und Verhalten zeigen, **kein** produktionsfertiger Code zum 1:1-Kopieren. Aufgabe ist es, dieses Design in der **bestehenden Umgebung des Ziel-Codebase** (React, Vue, Svelte, Angular, …) mit dessen etablierten Mustern, Komponenten und i18n-Bibliotheken **nachzubauen**. Existiert noch keine Umgebung, das am besten passende Framework wählen.

Konkret heißt das u. a.:
- Das **i18n** ist hier als simpler DOM-Text-Walker gelöst (`landing-v2-i18n.js`, `pages/legal-i18n.js`). In einer echten App stattdessen die vorhandene i18n-Lösung nutzen (react-i18next, vue-i18n, …) und die deutschen Strings als Schlüssel/Quelle übernehmen. Die Wörterbücher in den `*-i18n.js`-Dateien sind die fertige Übersetzungsquelle (DE→EN/FR/NL) und können direkt extrahiert werden.
- Das **Tweaks-Panel** (`landing/tweaks-panel.jsx`, `landing-v2-tweaks.jsx`) ist reines Design-Exploration-Werkzeug und gehört **nicht** in die Produktion. Die per Tweak gesetzten `body[data-*]`-Varianten sind unten dokumentiert — final gilt der hier ausgelieferte Stand (siehe „Default-Zustand").
- Die **UI-Mockups** (Video-Player, Kommentar-Thread, Gruppenliste, Report, Buchungskalender, Call-Raum) sind statische HTML-Nachbauten echter App-Screens, rein illustrativ. Sie müssen nicht funktional nachgebaut werden — es sind „Bilder", die das Produkt andeuten (im Markup als `role="img"`, `pointer-events:none`, nicht selektierbar).
- **Foto-Slots** (Hero + zwei „Für wen"-Karten) sind Platzhalter (`<image-slot>` Web-Component). In Produktion durch echte `<img>`/Bildkomponenten ersetzen. Der Hero-Slot ist für ein **Bewegtbild/GIF** (Reitsequenz im Loop) vorgesehen.

## Fidelity
**High-fidelity (hifi).** Finale Farben, Typografie, Abstände, Radien, Schatten und Interaktionen. Pixelgenau mit den Bibliotheken/Mustern des Ziel-Codebase nachbauen. Die Designtokens stammen aus dem Zeta/Strido Design System (`colors_and_type.css`) — falls im Ziel-Codebase bereits ein Token-System existiert, dort einpflegen.

## Default-Zustand (für diese Auslieferung verbindlich)
Auf `<body>` gesetzt — das ist der finale, gewünschte Stand:
- `data-hero="geteilt"` — Hero mit Text links, Mockup/Foto rechts
- `data-scale="standard"` — Standard-Typo-Skala
- `data-live="dunkel"` — Live-Coaching-Sektion mit dunklem (Espresso-)Hintergrund
- `data-logo="wortmarke"` — Strido-Wortmarke (SVG) im Header/Footer
- **`data-bg-rhythm="ruhig"`** — **ruhiger Hintergrund: alle Sektionen cremefarben, KEINE warmbeigen Bänder.** (Dies ist der gewünschte Default dieses Handoffs.)

> Hinweis zum Hintergrund-Rhythmus: Im Markup tragen einige Sektionen `data-bg="warm"` (Buchung, Fortschritt, Sportarten, Stimmen). Diese werden **nur** dann warmbeige eingefärbt, wenn `body[data-bg-rhythm="rhythmus"]` gesetzt ist. Im ausgelieferten `ruhig`-Modus sind sie transparent (creme). Das „Kostenlos"-Band (`.lp-free-band`) ist davon unabhängig und **immer** warmbeige.

## Screens / Views

### 1. Header (sticky)
- **Layout**: Sticky oben, `height: 64px`, Hintergrund `rgba(255,248,237,.9)` + `backdrop-filter: blur(8px)`, untere Border `1px solid var(--z-border)`. Inhalt in `.lp-container` (max-width 1120px), Flex-Row, `gap: 32px`.
- **Komponenten**:
  - Logo links (Wortmarke-SVG, Höhe 20px). Variante „bildmarke" zeigt stattdessen Pferde-Icon (32×32, radius 8px) + Wortlaut „Strido" (20px, semibold).
  - Nav (`.lp-nav`, ab >820px sichtbar): Links 14px/medium, `var(--z-muted)`, Hover-Hintergrund `var(--z-surface-warm)`.
  - Rechts (`.lp-header-actions`, `margin-left:auto`): **Sprachumschalter**, Ghost-Button „Anmelden" (auf <560px ausgeblendet), Primary-Button „Kostenlos starten".
- **Sprachumschalter** (`.lp-lang`): Button mit Globus-Icon (lucide `globe`) + Sprachkürzel (DE/EN/FR/NL) + Chevron. Klick öffnet Dropdown (`.lp-lang-menu`, min-width 184px, `box-shadow: var(--z-shadow-pop)`) mit 4 Optionen (Kürzel + Sprachname + Häkchen bei aktiver Sprache). Auswahl persistiert in `localStorage["strido_lang"]`, setzt `<html lang>` und wird zwischen Landingpage und Unterseiten **geteilt**.

### 2. Hero (`.lp-hero`)
- **Layout**: 2-Spalten-Grid `minmax(0,1.02fr) minmax(0,1fr)`, `gap: 64px`, vertikal zentriert. Padding `88px 0 72px`. Bei `data-hero="zentriert"`: einspaltig, zentriert. Unter 920px einspaltig.
- **Copy-Spalte**: Eyebrow-Pill („Video-Coaching für den Reitsport", Icon `video`), H1 (`clamp(38px,5.4vw,64px)`, weight 800, line-height 1.06, letter-spacing −0.03em, balance), Lead-Absatz (19px, `var(--z-muted)`, max 34em), CTA-Row (Primary „Kostenlos starten" + Secondary „So funktioniert's"), darunter die grüne „Komplett kostenlos"-Pill.
- **Visual-Spalte**: `<image-slot>` (Hero-Bild/GIF, Höhe 440px, radius 12px, `box-shadow: var(--z-shadow-pop)`) mit überlappender, schwebender Kommentar-Karte unten links (`.lp-hero-float`, Avatar + Coach-Name + Zeitstempel + Feedbacktext).

### 3. „Kostenlos"-Band (`.lp-free-band`, #kostenlos)
- Warmbeiger Vollbreiten-Streifen (`var(--z-surface-warm)` = `#fff1dc`), oben/unten Border, Padding `48px 0`. Flex: links Headline (`Komplett *kostenlos*. Für Trainer und Reiter.`, „kostenlos" in `var(--z-primary-text)`) + Subline, rechts 3 Checkpunkte (Icon `check-circle-2` in `var(--z-success)`).

### 4. Zwei Wege (`.lp-ways`, #so-funktionierts)
- Zentrierter Section-Head (Kicker + H2 + Subline), darunter 2-Spalten-Grid (`gap: 24px`, unter 820px einspaltig).
- Jede Karte (`.lp-way`): Surface, Border, radius `var(--z-radius-lg)`, Padding 32px. Kopf mit Icon-Kachel (48×48) + Kicker + H3. Darunter eine **Schrittliste** (`.lp-flow`) mit nummerierten Punkten (`.lp-flow-dot`, 32px Kreis) und vertikaler Verbindungslinie, die **am letzten Punkt endet** (per `:not(:last-child)::after`). Asynchron: 3 Schritte; Live: 4 Schritte.

### 5. Feature-Reihen (`.lp-feature`)
Wiederkehrendes 2-Spalten-Muster (`minmax(0,1fr) minmax(0,1.1fr)`, `gap: 72px`; `.lp-flip` dreht die Reihenfolge; unter 920px einspaltig). Links Copy (Kicker, H2, Lead, `.lp-feature-list` mit Icon-Kachel + strong + Text), rechts ein UI-Mockup.
- **Feedback** (#funktionen): Mockup = Video-Player (16:9, dunkel, Play-Button in `var(--z-primary)`, Fortschrittsbalken) + Kommentar-Thread mit Zeitstempeln, einer eingerückten **Antwort** (`.lp-mock-reply`, L-förmiger Connector) und Composer-Zeile.
- **Live-Coaching** (#live, dunkles Band): Sektion `.lp-dark-band` mit Hintergrund `var(--z-night)`, heller Schrift. Mockup = Call-Raum (`.lp-mock-call`): großes Avatar-Tile + PiP + 3 runde Steuer-Buttons (mic/camera/phone-off; letzter in `var(--z-danger-solid)`).
- **Buchung** (#buchung): Mockup = Wochen-/Slot-Kalender (`.lp-booking-grid`, 3 Tage × Slots; ein Slot `.lp-bk-selected` in Primary) + Bestätigungszeile mit „Buchen"-Button.
- **Stall & Gruppen** (`.lp-flip`): Mockup = Gruppenliste mit Avataren, Namen, Meta-Zeile (keine E-Mail-Adressen — bewusst durch Aktivitätshinweise ersetzt) und Rollen-Badges (Trainer/Reiter) + ausstehende Einladung.
- **Fortschritt** (Reports): Mockup = Report-Karte mit 3 Balken (Videos/Feedback/Live-Sessions), Trend-Badge „+18%" und Kennzahl „5,2 Std.".

### 6. Für wen (`.lp-audience`, #fuer-wen)
- 2-Spalten-Grid (`gap: 20px`, unter 820px einspaltig). Zwei Karten („Für Reiter", „Für Trainer"), jeweils oben ein Foto-`<image-slot>` (Höhe 240px), darunter Body (H3 + Absatz + 5 Vorteilspunkte mit `check`-Icon). **Wichtig**: Die Rollen-Vorteile sind bewusst getrennt — z. B. „Text mit KI verbessern" steht nur bei Trainern.

### 7. Disziplinen & Sportarten (`.lp-sports`)
- Zentrierter Head, dann zwei Gruppen: (a) Reitsport-Disziplinen als prominente Chips (`.lp-sport-chip.lp-sport-primary`, erste mit `award`-Icon), (b) „und für jeden Sport mit Technik & Form" als **Auto-Scroll-Marquee** (`.lp-marquee`, 32s linear infinite, pausiert bei Hover, respektiert `prefers-reduced-motion`). Liste in der Marquee ist verdoppelt für nahtlosen Loop (Duplikate `aria-hidden`).

### 8. Roadmap (`.lp-roadmap-grid`)
- 2×2-Grid gestrichelter Karten (`border: 1px dashed`). Jede Karte: Kopfzeile (`.lp-roadmap-top`, Flex space-between) mit Icon-Kachel links und Status-Badge rechts (`.lp-soon` „Kommt bald" / `.lp-soon-planned` „Fest geplant"), darunter H3 + Text. Inhalte: Annotation, Sprach-Feedback (kommt bald); iOS/Android-Apps, Trainingspläne (fest geplant).

### 9. Testimonials (`.lp-quotes`)
- 3-Spalten-Grid (unter 900px einspaltig). Karten mit 5 Sternen (lucide `star`, gefüllt in `var(--z-accent)`), Zitat, Autor (Avatar + Name + Rolle). **Platzhalter-Texte** — vor Go-Live durch echte Zitate ersetzen (Hinweiszeile darunter).

### 10. Abschluss-CTA (`.lp-cta-card`, #start)
- Zentrierte Karte (Surface, radius lg, `box-shadow: var(--z-shadow-card)`, Padding 72px 32px): Pferde-Icon (56px), H2, Absatz, Primary-Button, grüne „Komplett kostenlos"-Pill.

### 11. Footer (`.lp-footer`)
- Border-top, Flex-Row: Logo + Tagline „Video-Coaching für den Reitsport. © 2026 Strido" + Links (Impressum/Datenschutz/Kontakt → `pages/…`).

### 12. Unterseiten (`pages/Impressum.html`, `Datenschutz.html`, `Kontakt.html`)
- Schmaler Lesebereich (`.legal-main`, max-width 760px). Eigener Header (Logo + „Zurück zur Startseite") und Footer, gleiche Marke. Jede Seite trägt oben einen deutlichen **Platzhalter-Banner** — die Rechtstexte sind Muster und vor Veröffentlichung anwaltlich zu prüfen. Kontakt zusätzlich mit Kontaktkanal-Karten + (nicht angebundenem) Formular. Alle Unterseiten haben denselben Sprachumschalter und teilen die Sprachwahl mit der Startseite.

## Interactions & Behavior
- **Sprachumschalter**: Dropdown öffnet/schließt per Klick (Outside-Click & Escape schließen). Wechsel übersetzt den gesamten sichtbaren Text (inkl. Mockup-Inhalte, Formular-Platzhalter), setzt `<html lang>`, persistiert in `localStorage["strido_lang"]`. DE ist Basis/Fallback; fehlt ein Schlüssel, bleibt der deutsche Text stehen.
- **Reveal-on-Scroll**: Elemente mit `.lp-reveal` faden + sliden beim Sichtbarwerden ein (IntersectionObserver, threshold 0.12). Basiszustand ist **sichtbar** — Animation nur bei `prefers-reduced-motion: no-preference` aktiv (Klasse `lp-anim` am `<html>`). Für SSR/Produktion gleichwertig umsetzen oder weglassen.
- **Marquee** (Sportarten): Endlos-Scroll, Hover pausiert, reduced-motion → statischer Wrap.
- **Hover-States**: Buttons (Primary → `--z-primary-strong`; Secondary/Ghost → `--z-surface-warm`), Nav-Links, Sprachoptionen, Chips. Fokus: `outline: 2px solid var(--z-primary)`.
- **Smooth-Scroll** für Anker-Navigation (`html { scroll-behavior: smooth }`, bei reduced-motion aus).
- **Responsive**: Breakpoints bei 920px (Hero/Features einspaltig), 820px (Gruppen/Audience/Roadmap), 720px (kompaktere Section-Paddings), 560px (Header: „Anmelden" weg, Hero-CTAs full-width gestapelt). Mockup-Badges & Buttons sind `white-space: nowrap` (verhindern Zeilenumbruch-Artefakte auf Mobile).

## State Management
Minimal — die Seite ist überwiegend statisch. Benötigter Zustand:
- **Aktive Sprache** (`de|en|fr|nl`), persistiert; steuert Textausgabe und `<html lang>`.
- **Dropdown offen/zu** (Sprachumschalter).
- (Nur Prototyp, nicht produktiv) Tweak-Zustand für `body[data-*]`-Varianten.

In einer echten App: Sprache über die vorhandene i18n-/Router-Lösung (z. B. Locale im Pfad `/en/…`), nicht über localStorage-Text-Replacement.

## Design Tokens
Aus `colors_and_type.css` (CSS-Custom-Properties auf `:root`). Kernwerte:

**Farben**
- `--z-bg: #fff8ed` (warmes Creme, Seitenhintergrund)
- `--z-surface: #fffffb` (Karten)
- `--z-surface-warm: #fff1dc` (warmes Beige — Kostenlos-Band, warme Bänder im „rhythmus"-Modus, Hover)
- `--lp-band: #f8e8d1` (kräftigeres Warmbeige für `data-bg="warm"`-Sektionen im „rhythmus"-Modus)
- `--z-night` (dunkles Espresso für Live-Band & Player), `--z-night-surface` (Player-Fläche)
- `--z-text` (Espresso-Text), `--z-muted` (gedämpfter Text)
- `--z-primary` / `--z-primary-strong` / `--z-primary-text` / `--z-primary-soft` (Marken-Orange ~`#ea580c`; „strong" für Hover, „text" für Akzenttext auf hell, „soft" für Borders)
- `--z-success` / `--z-success-soft` / `--z-success-border` (grüne Erfolg-/Kostenlos-Akzente)
- `--z-accent` (Sterne), `--z-danger-solid` (Call-„auflegen"-Button)
- `--z-border` (1px-Linien)

**Typografie**: `--z-font-sans` (Inter-Stack). Gewichte über `--z-weight-medium/semibold/bold`. Marketing-Skala in `landing-v2.css` bzw. `landing/landing.css`: H1 `clamp(38px,5.4vw,64px)`, H2 `clamp(28px,3.6vw,40px)`, Lead 19px, Body 16px (alle bei `data-scale="gross"` größer).

**Radien/Schatten**: `--z-radius-sm/md/lg/full`; `--z-shadow-sm`, `--z-shadow-card`, `--z-shadow-pop`, `--z-shadow-drawer`. **Spacing**: Section-Padding `--lp-section-pad` (104px Desktop, runter bis 60px auf Mobile), Container max-width 1120px (`--lp-max`).

Die vollständigen Werte stehen in `colors_and_type.css` — von dort übernehmen, nicht neu erfinden.

## Assets
- `assets/zeta-horse-mark-orange-128.png` — Strido-Bildmarke (Pferd, orange), 128px. Genutzt als Favicon, Logo-Bildmarke, CTA-Icon.
- `landing/strido-wordmark.svg` — Strido-**Wortmarke** (Vektor; Farben an Tokens angeglichen: Ink `#26180f`, Akzent `#ea580c`). Primäres Header-/Footer-Logo.
- **Icons**: [Lucide](https://lucide.dev) via CDN (`<i data-lucide="…">`, `lucide.createIcons()`). Im Ziel-Codebase die vorhandene Icon-Bibliothek nutzen (z. B. `lucide-react`). Verwendete Namen u. a.: video, clock, sparkles, check-circle-2, send-horizontal, play, users, link, settings, calendar-days/clock/check, mic, camera, phone-off, archive, message-square-text, upload, repeat, trending-up, file-text, user-plus, shield-check, circle-user-round, map-pin, truck, route, globe, smartphone, clipboard-list, pen-line, star, badge-check, chevron-down, check, arrow-left, mail, phone, life-buoy, mouse-pointer-click, bell, award.
- **Foto-Slots** (`<image-slot>`, `landing/image-slot.js`): Platzhalter für echte Bilder — Hero (Bewegtbild/GIF) + 2 „Für wen"-Karten. In Produktion durch echte Bildkomponenten ersetzen.
- **Schrift**: Inter (System-/Webfont-Stack in `colors_and_type.css`). Im Ziel-Codebase via vorhandene Font-Pipeline laden.

## Files (in diesem Bundle — Assets liegen neben der HTML, nicht eingebettet)
```
design_handoff_landing_v2/
├── Strido Landingpage v2.html      ← Einstieg (data-bg-rhythm="ruhig")
├── colors_and_type.css             ← Design-Tokens (Farben, Typo, Radien, Schatten)
├── landing-v2.css                  ← v2-spezifische Stile (Hero-Foto, Bänder, Sprachumschalter, Mobile, Mockups)
├── landing-v2-tweaks.jsx           ← Tweaks-Insel (NICHT produktiv; hintergrund-Default "ruhig")
├── landing-v2-i18n.js              ← Übersetzungs-Engine + Wörterbuch DE→EN/FR/NL (Quelle für echte i18n)
├── landing/
│   ├── landing.css                 ← geteilte Basis-Stile (Header, Buttons, Sektionen, Feature-Reihen, Mockups, Mobile)
│   ├── tweaks-panel.jsx            ← Tweaks-Panel-Shell (NICHT produktiv)
│   ├── image-slot.js               ← <image-slot> Web-Component (Foto-Platzhalter)
│   └── strido-wordmark.svg         ← Wortmarke
├── assets/
│   └── zeta-horse-mark-orange-128.png  ← Bildmarke
└── pages/
    ├── Impressum.html
    ├── Datenschutz.html
    ├── Kontakt.html
    ├── legal.css                   ← Stile der Unterseiten
    └── legal-i18n.js               ← i18n der Unterseiten (DE→EN/FR/NL), teilt localStorage-Schlüssel
```

Zum Ansehen `Strido Landingpage v2.html` im Browser öffnen — alle Assets liegen relativ daneben und laden direkt (React/Babel/Lucide kommen per CDN; Internetverbindung nötig).

## Hinweise vor Go-Live
- **Rechtstexte** (Impressum/Datenschutz) sind Muster → anwaltlich prüfen und durch echte Unternehmensdaten ersetzen.
- **Testimonials** sind Platzhalter → echte Zitate einsetzen.
- **Fotos/Hero-GIF** einsetzen (aktuell leere Slots).
- **Tweaks-Panel und i18n-Text-Walker** sind Prototyp-Werkzeuge → durch native Codebase-Lösungen ersetzen.
- Kontaktformular ist **nicht** angebunden → Backend/Service verbinden.
