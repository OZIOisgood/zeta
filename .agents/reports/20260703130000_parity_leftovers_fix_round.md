# Parity-Altlasten: Umsetzung aller Audit-Pakete + Row-Interaktions-SOTA

**Datum:** 2026-07-03 · **Branch:** `feat/mobile-token-auth` · **Commits:** `44ddef7`, `9a941ca`, `6fbc29a`
**Grundlage:** Audit `.agents/reports/20260703120000_parity_leftovers_mock_audit.md` (alle Findings umgesetzt oder begründet abgewichen)

## Kontext

Der 3-Reviewer-Mock-Diff hatte Altlasten aus der Web-Parity-Phase in sechs Paketen priorisiert. Auftrag: alles nachziehen, Row-Interaktionen auf SOTA heben (Zusatzfrage: Edit-/Löschen-Buttons auf Zeilen), danach Code-Review.

## Entscheidung: Row-Interaktions-SOTA statt Mock-Buttons

Der Mock zeigt auf Listenzeilen Pencil-/Trash-Icon-Buttons (Web-Muster). Auf Mobile ist SOTA (HIG „Swipe to delete", M3 swipe actions): **Zeile antippen = bearbeiten** (Chevron als Affordance), **Swipe = löschen**, expliziter Lösch-Button nur bei aktivem Screenreader (`useScreenReader()`), damit die destruktive Aktion zugänglich bleibt. Umgesetzt auf: Terminarten (`session-type-row`), Zeitplan-Tage (`schedule-day-row`), Mitglieder (`member-row`), gesperrte Termine (`availability.tsx`). Geprüfte, bewusst NICHT umgestellte Stellen: Kommentar-Footer-Aktionen (Web-Terminologie-Anker), Upload-Picker-X (Inline-Entfernen einer Auswahl, kein persistenter Datensatz), Notification-Accept/Decline (CTAs, keine Row-Edits).

## Umgesetzte Pakete

1. **Gruppen**: Einstellungen mit Header-Save (Stack `headerRight`, canEdit-gated), zentriertem Avatar, Karte Name→Beschreibung, Danger-Zone als antippbare Zeilen (ZIconTile danger, Divider, Leave+Delete inkl. zweitem ConfirmDialog); Create mit Mock-Avatar-Picker (gestrichelter Leerzustand + Plus-Badge in `z-avatar-input`), „Optional"-Hint (`z-field-label` `hint`), Submit-Gating; Liste mit Chevron + Plattform-Separatoren (iOS inset-Divider/Gruppierung, Android Abstand).
2. **Reports + Invite**: `stat-card` nach Mock-Anatomie (getöntes Icon-Tile sm → 26er-Zahl → einzeilige Label → Footer-Pill, `tone`-Prop); Invite-Scanner quadratisch mit Rahmen- und Caption-Overlays (`pointerEvents="none"`), Confirm-Hero (Avatar 72, Name 21/extrabold, Meta-Zeile), Join mit Check-Icon, Decline secondary.
3. **Login**: Brand-Block über der Karte (Tile+Wortmarke+Tagline), zweiter `useAuthRequest` mit `screen_hint: 'sign-up'` hinter tonalem „Konto erstellen" (neuer Key `auth.login.createAccount` in web+mobile en/de/fr).
4. **Booking**: `ZDateRail` mit `disabled`-Tagen + `contentPadding`; Rail zeigt die kontinuierliche Tagesfolge (heute→letzter Slot-Tag, 60-Tage-Cap), slotlose Tage ausgegraut; Stepper aus der ScrollView gepinnt; Rail full-bleed; `ZListItem` selected mit Accent-Ring (konstante Border-Breite).
5. **Notifications + Quernits**: Read-State-getriebenes Tile (unread = Accent-Container+Accent-Glyph, gelesen = neutral; Glyphen je Typ nach Mock), Zähler nur am Ungelesen-Segment; Home 2 Teaser + Hero-Join flex-1; Composer-Seek-Chip ohne Check; Upload `upload.files`-Label + Upload-Glyph am Submit; Sprache als natives ZSelect (kurze feste Liste; Zeitzone bleibt Such-Combobox), Pflicht-Asterisken entfernt; Invite-Result „QR herunterladen" secondary.

## Begründete Abweichungen vom Mock

- **Invite-Result bleibt gestapelt**: die Mock-QR-Kachel ist ein 76px-Icon-PLATZHALTER (dashed); die App rendert einen echten 160px-QR, den der Invite-Scanner direkt abscannt — neben der Button-Spalte fiele er unter Scan-Größe (DE/FR-Labels passen zudem nicht). Im Code dokumentiert.
- **Row-Buttons des Mocks** ersetzt durch Swipe/Tap-SOTA (oben).

## Verifikation

- Gates: `make mobile:lint` (0 Errors), `make mobile:typecheck`, Jest **818/818** (Teaser-Test auf 2 angepasst; ein React-Compiler-Purity-Error in `book.tsx` — `Date.now()` im Render — behoben über den bestehenden `new Date()`-Schnappschuss).
- Android-Emulator (frisches Bundle nach Metro-Neustart), Screens einzeln abgefahren: Home (2 Teaser), Notifications (Zähler/Tiles), Gruppenliste (Chevron), Invite-Result (secondary QR-Button), Gruppen-Einstellungen (Header-Save, Avatar, Danger-Zone), Member-Swipe („Benutzer entfernen"), Create (Avatar-Leerzustand, Optional-Hint, disabled Submit), Persönliche Daten (Sprache-Select samt Dropdown, keine Asterisken), Booking (formSheet, gepinnter Stepper, Rail mit disabled Tagen + full-bleed, Accent-Ring, Footer-Summary), Experten-Bericht (StatCard-Anatomie), Logout→Login (Brand-Block, zwei CTAs) → Re-Login OK.
- Nur code-verifiziert (kein Device-Drive): Upload-Review-Step (Label/Icon), Composer-Chip, Hero-Join flex-1 (kein joinbarer Termin im Fenster), Scanner-/Confirm-Screen (bräuchte Studenten-Session; Layout jest-gedeckt).

## Follow-ups

- Abschluss-Code-Review (2 parallele mobile-reviewer über `4053933..HEAD`) — Findings werden in dieser Runde gefixt; Ergebnis unten nachgetragen.
- PR-#15-Body um frische Screenshots ergänzen (SHA-gepinnte Assets).

## Review-Ergebnis (2 parallele mobile-reviewer über `4053933..HEAD`)

17 Findings, alle in `fc203dd` behoben (Gates danach erneut grün: tsc, Lint 0 Errors, Jest 820/820 inkl. 2 neuer Tests):

**Major**
1. Owner sah eine garantiert fehlschlagende „Gruppe verlassen"-Zeile (Backend 400 erst NACH dem Permission-Check; Web blendet via `owner_id` aus) → `canLeave` schließt den Owner jetzt aus.
2. Hero-Join: `className="flex-1"` streckte nur den unsichtbaren ZButton-Wrapper, der Pill blieb content-width → zusätzlich `fullWidth`.
3. `z-list-item.ios.tsx` hatte KEINEN sichtbaren Selected-Zustand (nur a11y-State) — im Booking-Flow wäre die Auswahl auf iOS unsichtbar → HIG-Checkmark-Accessory (Accent) + Kontraktdoku in `.types.ts`.

**Minor**
4. Rail renderte einen Phantom-Tag nach dem letzten Slot-Tag (`>` gegen Millisekunden-Schranke; DST-anfällig) → Day-Key-Vergleich mit `endKey` + break nach dem Push.
5. (Altbestand, gleich mitgefixt) Stepper ließ Confirm mit `slot=null` erreichbar (Tageswechsel clampte `reached` nicht) → Clamp in `handleSelectDay` wie in den übrigen Handlern.
6. Create-Group: Pflichtfeld-Fehlerpfade nach dem disabled-until-valid-Umbau unerreichbar (toter Code) → `touched`/`ZFieldError`-Plumbing entfernt; Guard bleibt als Belt; Required-Kommunikation läuft über die Handoff-Konvention (Optional-Hint markiert optionale Felder).
7. Login: beide Flows teilten `busy` → Spinner erschien auf „Anmelden", auch wenn „Konto erstellen" getippt wurde → `busy: 'signIn' | 'signUp' | null`, Spinner je Button, beide während des Flights gesperrt.
8. Unread-Glyph nutzte `accentStrong` statt Mock-`onAccentContainer` → Token getauscht (Gerät verifiziert: dunkelbraunes Glyph auf Accent-Container).
9. StatCard-Abstände (Label mt-1→mt-2, Footer mt-1.5→mt-2.5 = Mock gap 8/10).
10. Avatar-Picker-Leerkreis ohne Mock-Füllung → `surface2`-Fill unter dem Dash (Gerät verifiziert).
11. Testlücken: Screen-Reader-Zweig der Swipe-Rows + `ZDateRail.disabled` ungedeckt → 2 neue Tests (member-row SR-Modus via gemocktem `useScreenReader`, Rail-disabled blockt Press + a11y-State).

**Nits**
12. Upload-Submit-Icon wiederholte das a11y-Label → `label=""` (dekorativ, Konvention).
13. Raw-Hex-Weiß im Scanner-Overlay (einzige Lint-Warnung des Diffs) → begründetes Inline-Disable (Theme-unabhängige Kamera-Fläche).
14. Inline-`ItemSeparatorComponent` in der Gruppenliste erzeugte pro Render einen neuen Komponententyp → auf Modulebene gehoben.
15. Danger-Zone-Rows ohne In-Flight-Feedback → trailing `ActivityIndicator` + Sperre beider Rows während `leaving`/`deleting`.
16. Swipe-Action-Icons auf `bg-z-danger` nutzten `onAccent` → semantisch korrektes `onDanger` (4 Stellen inkl. booking-card).
17. `default:`-Fall im Notification-Glyph-Switch schluckte künftige `NotificationIcon`-Member stumm → expliziter `invite`-Case + `never`-Exhaustiveness-Guard.

Ohne Befund laut Reviewern: i18n-Vollständigkeit aller neuen Keys (6 Dateien), Query-/Mutationszustände, Permission-Gates (außer 1.), sensible Logs, typed routes/formSheet, Compose-Defekt-Regeln, Self-Import-Ban, `use-screen-reader`-Subscription, Zeitzonen-Konsistenz der Rail-Keys.

## Addendum: ZTabs-Haken links (Compose-Defekt #6)

Nutzerbefund nach der Runde: Im Android-Segment klebt das M3-Häkchen am linken
Rand statt bei der Beschriftung. Ursache: @expo/ui hostet das SegmentedButton-
Label als RN-SlotView, die Compose die VOLLE Segmentbreite meldet — die interne
M3-Zeile [Check][8dp][Label] hat keinen Spielraum, der (nicht abschaltbare)
Default-Check pinnt links, das Label zentriert separat; dasselbe Mis-Measurement
clippte im gewählten Segment auch den Zähler („(1)" fehlte) und verursachte die
früheren Label-Umbrüche. Fix: ZTabs Android als RN-Implementierung im
Kit-Material-Look (Pill-Reihe, Hairline-Trenner, Check+Label als Gruppe
zentriert; iOS-SwiftUI-Variante unverändert); als Defekt #6 in mobile/AGENTS.md
dokumentiert, SegmentedButtonRow aus der Works-Liste entfernt. Emulator
verifiziert („✓ Bevorstehend (1)" gruppiert zentriert), tsc/Lint/Jest grün
(819 — ein dynamischer Compose-Guard-Testfall entfällt mit der Compose-Datei).
