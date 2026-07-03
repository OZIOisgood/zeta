# Android: Segmented-Umbruch, Icon-Button-Totzone, ZDialogPanel-Compose-Retreat

## Kontext

Zwei User-Reports am Morgen (2026-07-03): (1) Termine-Segmente „sehen seltsam aus" (aktives Segment zweizeilig/höher), (2) „Terminart hinzufügen" wirft einen Console-Error (`ModalBottomSheetView must be rendered as a direct child of a <Host>`). Die Analyse fand eine dritte, gravierendere Ursache dahinter.

## Befunde & Fixes (Commit `663e9b4`)

1. **ZTabs (Android)**: DE-Label „Bevorstehend (1)" + M3-Häkchen passte nicht in ein Segment → Compose-`Text` ohne `maxLines` bricht um → Row zerfällt in ungleiche Höhen. Fix: `maxLines={1}`. Rest-Verhalten: beim längsten Label clippt der Zähler weg (auf 411 dp sauber; auf schmaleren Geräten könnte der Clip unschön sitzen — beobachten).
2. **ZIconButton (Android), app-weit**: Der RN-Interop-View des Icons liegt ÜBER dem Compose-Button und schluckt Taps auf der Icon-Fläche — **jeder Icon-Button hatte eine tote Mitte** (FAB, Stift, Papierkorb, …); Rand-Taps funktionierten, daher wirkte alles „flaky". Fix: `pointerEvents="none"` auf dem Icon-Wrapper (beide Pfade). Gefunden via `uiautomator dump` (Bounds/clickable) + gezielten Rand/Mitte-Taps.
3. **ZDialogPanel (Android)**: @expo/ui-`ModalBottomSheet` rendert aus RN-Hosting **nie** (bare = Console-Error; mit `<Host>`/`<Host matchContents>`, Kinder direkt oder gebridged = komponiert zu nichts). Compose-`AlertDialog` (ZConfirmDialog) funktioniert dagegen. Retreat nach z-card-Präzedenz: shared RN-Implementierung (`z-dialog-panel.shared.tsx`, M3-Basic-Dialog), bare + android re-exporten sie; Primitive-Contract-Test bleibt erfüllt. Follow-up-Option: Verfügbarkeits-Sheets als native formSheet-Routen (Muster upload/book/cancel).

## Verifikation (Dev-Build, DE)

- Segmente: einheitliche Kapsel-Row, selektiert mit Zähler einzeilig („✓ Vergangen (8)").
- Terminart hinzufügen/bearbeiten: Sheet öffnet per **Center-Tap** auf FAB und Stift, Formular vorbefüllt, Abbrechen schließt.
- Löschen: AlertDialog erscheint (Center-Tap Papierkorb), abgebrochen.
- Gates: Jest 817/817 (113 Suites), Lint 0 Errors, tsc sauber.

## Werkzeug-Lektionen (Memories aktualisiert)

- UNC-Edits erreichen auch den Dev-Menü-Reload nicht zuverlässig (Metro-Transform-Cache) — 4 Blind-Zyklen auf ein Fix getestet, das nie im Bundle war. `touch` aus WSL nützt nichts (IN_ATTRIB). Verlässlich: **Metro-Neustart** (`--clear` wenn Dateien gelöscht wurden — Haste-Map löst sonst weiter auf sie auf).
- Navigation am Emulator: nach jedem Tap per `uiautomator dump` verifizieren statt Blind-Sequenzen mit festen Sleeps (Bundle-Ladezeiten variieren 15–60 s).
