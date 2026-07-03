# Android-Fehler-Sweep: Icon-Button-Retreat, Chip-Totzone, Boot-Locale-Daten, Copy

## Kontext

User: „alle fehler fixen" nach den Morgen-Reports. Vorgehen: Code-Sweep über alle `.android.tsx` auf RN-Interop-in-Compose-Muster + Emulator-Walkthrough (Verfügbarkeits-CRUD E2E, Benachrichtigungen, Videos/Upload/Detail) mit logcat-Überwachung. Commit `ad5702c` (aufbauend auf `663e9b4`).

## Befunde & Fixes

1. **ZIconButton: kompletter Compose-Retreat auf Android.** Über den Touch-Swallow (663e9b4) hinaus zeigte sich am Gerät: Compose-Icon-Buttons rendern LEER, wenn ihr Host in einem non-initial Commit mountet — neue Listen-Row nach Mutation-Refetch und Tab-Wechsel-Remount ließen Rows ohne Stift/Papierkorb zurück (First-Paint-Krankheit wie z-card). Android nutzt jetzt die shared RN-Pressable-Implementierung (`z-icon-button.shared.tsx`, bare+android re-exporten). Verifiziert: Icons überleben Remounts, Center-Taps treffen (FAB, Stift, Papierkorb, Header-Glocke, Sheet-X).
2. **ZChip**: `pointerEvents="none"` auf dem Leading-Check-Interop-Icon (gleiche Totzonen-Klasse, kleiner Radius).
3. **Verfügbarkeit/Blockiert**: `DATE_OPTIONS` war im Modul-Scope in der Boot-Locale eingefroren (DE-App zeigte „7/3/2026"); jetzt per `useMemo` pro Sprache (behebt auch das über Mitternacht veraltende „today"). Verifiziert: „3.7.2026".
4. **i18n DE**: `savedSessionType` sagte „Session-Art gespeichert", überall sonst heißt es „Terminart" — angeglichen (mobile+web).

## Walkthrough-Ergebnis (Dev-Build, DE, Experte)

- Terminarten-CRUD komplett grün: Anlegen (Compose-TextField-Eingabe im RN-Modal funktioniert), Toast, Row erscheint; Bearbeiten vorbefüllt; Löschen mit AlertDialog + Toast.
- Zeitplan-Sheet: Select-Dropdown öffnet, Auswahl übernimmt. Blockiert-Sheet: DE-Datum, Ganztägig-Defaults.
- Benachrichtigungen (Glocke Center-Tap), Videos-Segmente, Upload-formSheet (X schließt), Video-Detail (Player, Kommentare, DE-Daten) — alles sauber.
- logcat über die gesamte Session: **0 JS-Fehler**; einzige Warnung ist die bekannte fehlende `EXPO_PUBLIC_WEB_BASE_URL` (User-Aktion, PR-Deploy-Note).

## Rest-Auffälligkeiten (bewusst offen)

- Segment-Zähler clippt beim längsten Label statt umzubrechen („Bevorstehend", „Zu überprüfen") — M3-konform einzeilig, auf 411 dp sauber; auf schmaleren Geräten beobachten.
- FAB ist durch den Retreat ein RN-Kreis statt M3-Rounded-Square — konsistent mit iOS/bare; bei Bedarf Feinschliff.
- Tab-Bar-Taps auf die LABEL-Zeile (y≈2272) wirken gelegentlich unzuverlässig, Icon-Zeile (y≈2226) trifft — nur adb-Automatisierung betroffen, kein User-Bug.

## Gates

Jest 817/817 (113 Suites; native-classname-Guard + Primitive-Contract erfüllt via shared-Re-Exports), Lint 0 Errors, tsc sauber.
