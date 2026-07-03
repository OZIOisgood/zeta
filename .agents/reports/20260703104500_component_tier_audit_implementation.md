# Komponenten-Tier-Audit: Bewertung + Umsetzung

## Kontext

User-Frage nach dem Select-Fix: „Warum keine native Komponente an der Stelle — bewusste Entscheidung? Prüfe grundsätzlich, ob die Custom-Komponenten sinnvoll sind." Audit über alle 36 `z-*`-Primitives, danach Umsetzung aller vier Empfehlungen (User: „alles umsetzen"). Commits `54a7b01` (Select-Dropdown-Affordance) und `5fb7555` (Audit-Umsetzung).

## Audit-Ergebnis (Kurzfassung)

- **Nativ & gesund (Compose, device-verifiziert):** TextInput/Textarea, Select (Exposed Dropdown), Segmented (ZTabs), Chip, Checkbox, AlertDialog, Progress, Snackbar, Button (filled); dazu native Navigation und ZSwitch (RN-Core = UISwitch/SwitchCompat).
- **Native-Tier mit dokumentiertem Android-RN-Retreat:** Card, IconButton, DialogPanel, FAB — erzwungen durch fünf belegte @expo/ui-Defekte (Host-Width, First-Paint-blank, Touch-Swallow, ModalBottomSheet-tot, Unsized-Interop-Overflow). iOS überall SwiftUI-nativ.
- **Custom-RN laut Governance (kein OS-Widget):** 16 Domain-/Layout-Primitives, alle begründbar.

Fazit: Tier-Modell ist gesund; Abweichungen sind empirisch, nicht stilistisch.

## Umsetzung (5fb7555)

1. **mobile/AGENTS.md → „@expo/ui Compose status"**: die fünf Defekte + Positivliste + Daumenregeln (readOnly-Fokus, Overlays als Routen) als Bau-Gate kodifiziert.
2. **formSheet-Migration**: `availability-session-type` / `availability-slot` / `availability-blocked` als native formSheet-Routen (Muster upload/book/cancel; Params groupId + optional Item-Id, Edit-Item aus warmem Query-Cache); Options-Builder nach `lib/availability-options.ts`; availability.tsx pusht Routen statt Inline-Sheets (−474 Zeilen). ZDialogPanel bleibt für ZConfirmDialog-children + ZVideoPartRail.
3. **M3-FAB**: die dokumentierte FAB-Kombination (primary+lg+circle) rendert 56 dp Rounded-Square (16 dp Ecken) statt Kreis.
4. **Tier-Label-Nachzug**: z-card/z-icon-button `.types.ts` dokumentieren den Retreat mit Verweis auf die AGENTS.md-Sektion.

## Verifikation

- Gerät (Dev-Build, DE): alle drei Routen öffnen als native Sheets (Grabber, SheetHeader+X, Vollhöhe); Terminart-E2E anlegen→Toast „Terminart gespeichert"→Row mit Icons→löschen; Slot-/Blocked-Sheets mit Chevron-Selects, Blocked-Datum „3.7.2026" (DE). FAB als Rounded-Square.
- Gates: tsc sauber (typed routes nach Metro-Neustart regeneriert), Lint 0 Errors, Jest 818/818.

## Follow-ups

- Bei @expo/ui-Upgrade (SDK 57+): die fünf Defekte gezielt re-testen (Suchanker: „Compose retreat", AGENTS.md-Sektion).
- iOS-Smoke-Test der neuen Routen zusammen mit dem ausstehenden iOS-Gate.

## Nachtrag: Mock-Abgleich der Formulare (9c4ec81)

User-Review gegen den Handoff (screens3-Dialoge) deckte auf, dass die Formulare nie mit dem Mock abgeglichen waren. Angepasst: Feldreihenfolge Name→Dauer→Beschreibung, Selects volle Breite (ZSelect-Host matchContents nur vertikal — behebt die ~60%-Breite app-weit), M3-Textbuttons (ghost/link, rechtsbündig), Dauer-Default 30, Blocked-Formular mit Ganztägig-SWITCH + bedingten Von/Bis-Feldern nebeneinander + einzeiligem Grund. Terminologie bleibt Web-geführt (Terminart). Gerät-verifiziert inkl. Switch-Toggle.
