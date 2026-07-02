# Mobile Full Review — Handoff-Konformität · Struktur · UX

**Datum:** 2026-07-02 · **Branch:** `feat/mobile-token-auth` (366 Dateien / ~42k Zeilen vs. main)
**Methode:** 3 parallele Code-Review-Agents (Struktur, Handoff, UX-Code) + manueller Emulator-Walkthrough (Android, beide Rollen: `test@zeta.dev` Expert, `student@zeta.dev` Student) mit ~30 Screenshots inkl. echter Buchung + Stornierung.

## Gesamturteil

Die App ist im Kern **sehr nah am Handoff** (Tokens 1:1, Selektionssprache konsequent, Booking-Flow mustergültig) und strukturell überdurchschnittlich diszipliniert (Tier-Contracts mechanisch enforced, i18n-Parität 632/632/632, 4-States fast überall). Es gibt aber **3 kritische Funde** (Build-Bruch bei frischem Clone, Sign-out-Sackgasse, stiller Login-Fehler — beide Auth-Funde im Emulator reproduziert) und einen Cluster sichtbarer Android-Bugs (formSheet-Header, Hero-CTA-Layout, Statusbar, Toast-Position).

## Kritisch

| # | Fund | Beleg |
|---|---|---|
| C1 | `mobile/src/lib/add-to-calendar.ts` ist **untracked**, wird aber von `book.tsx:16` importiert (+ Test-Mock). Frischer Clone/CI: Typecheck, Jest und Metro brechen. → `git add` | Struktur-Agent; Button live auf Booking-Success gesehen |
| C2 | **Sign-out strandet im Browser:** WorkOS-Logout-Redirect zeigt auf `app.strido.net` (Prod, ERR_CONNECTION_CLOSED) statt Dev-URL/App-Scheme → Nutzer landet auf Chrome-Fehlerseite, muss Tab manuell schließen. Zusätzlich kein Confirm vor Sign-out. | Emulator reproduziert (Screenshot 17) |
| C3 | **Stiller Login-Fehlschlag:** `auth/callback.tsx:26` `completeLogin(code).catch(() => undefined)` → fehlgeschlagener Token-Exchange wirft den Nutzer kommentarlos auf /login zurück. Im Emulator real passiert (1. Student-Login schlug still fehl; 2. Versuch mit warmer AuthKit-Session ging durch). | UX-Agent + Emulator reproduziert |

## Major (sichtbar/funktional)

1. **Android formSheet rendert keinen Header** — `headerShown: true` gesetzt (`_layout.tsx:145,159,175`), wirkungslos: upload/book/cancel-Sheets haben **weder Titel noch Close-Button**; `cancel/[bookingId]` erwartet den Header und rendert den Bestätigungstext **oben abgeschnitten** (Screenshot 37). Fix: eigenen Sheet-Header im Content rendern oder Top-Inset + expliziten Close.
2. **Hero-CTA „Book session" (Android) zerlegt:** `ZButton` mit `icon` rendert Compose-`Row` mit RN-View-Interop → Button streckt sich auf volle Breite, Icon klebt links, Label rechts (`z-button.android.tsx:138-148`, bekannte @expo/ui-Host-Falle; `next-session-card.tsx:59-65`). FAB (Custom-RN) zeigt korrektes Verhalten.
3. **Dark Mode Chrome auf Light-Hexes gepinnt:** `DETAIL_SCREEN_OPTIONS` + formSheet-Optionen + Icon-Tints nutzen statisches `colors` (light-only) statt `useRoleColors` → heller Header/dunkelorange Icons im Dark Mode (`_layout.tsx:71-80,141-183`, `tab-screen-options.ts:24`, div. Screens). `userInterfaceStyle:"automatic"` ist aktiv.
4. **Home-Datenfrische:** (a) `focusManager` nie an `AppState` gekoppelt → nach Foreground bleiben alle Listen stale; (b) Home ist der einzige Index ohne `RefreshControl`; (c) `bookings.isError` → Error rendert als „Buche deine erste Session"-Empty (Error-als-Empty). `(home)/index.tsx:89,238`, `api/query-client.ts`.
5. **Statusbar-Style ungesetzt:** weiße Uhr/Icons auf Creme-Hintergrund auf jedem Screen (kein `expo-status-bar`/app.json-Setting; Paket ist sogar ungenutzte Dep). 
6. **Swipe-only-Cancel:** Stornieren nur per Swipe erreichbar — keine `accessibilityActions`, null Discoverability (`booking-card.tsx:220`, `z-swipeable.shared.tsx:38`). Dazu: Success-**Toast überlappt die Tab-Bar** und sagt nur „Success" ohne Beschreibung (Screenshot 38; `z-toast.android.tsx`, `cancel/[bookingId].tsx:62`).
7. **Android-Felder ohne Focus-Affordance:** `z-text-input.android.tsx:55-57` / `z-textarea.android.tsx:53-55` ohne 2dp-Accent-Focus (Handoff-Pflicht); TextInput zudem 52 statt 56dp.
8. **UTC-Datumsfehler Availability:** Blocked-Dates via `toISOString().slice(0,10)` + UTC-Parse → westlich von UTC ein Tag zu früh angezeigt, östlich „heute"-Default nach Mitternacht falsch (`availability.tsx:80,330`).

## Medium (Konformität/UX-Politur)

- **EN-Copy systematisch Title Case** (gegen Handoff „sentence case everywhere"): Create Group, Create Invitation, Select Video/Enter Details, Select Expert/Session Type/Select Time, Cancel/Keep/Book Session, Group Name, Email Address (optional)… — Quelle sind die Web-JSONs (de/fr korrekt) → dort fixen + `sync:i18n`.
- **Tab heißt „Preferences" statt „Profile"** (`(tabs)/_layout.tsx:106` nutzt `preferences.title`; Handoff-Nav: profile→person).
- **„All my videos" zeigt gruppenweite Videos** — Expert und Student sehen dieselbe Liste; Possessiv für mind. eine Rolle falsch. Dazu **Kommentar-Zählung inkonsistent**: Home-Karte „2" (inkl. Replies) vs. Detail-Header „1" (nur Top-Level).
- **First-Steps-Checkliste rollenfremd:** Gates auf Read-Permissions (`groups:read`, `reviews:read` in `(home)/index.tsx:113-169`) → Student sieht „Group created / Your first group is ready for students and videos" + „Review videos" (Creator-Copy). Gates auf create/manage-Permissions umstellen.
- **Studenten-Gruppensicht verwirrend:** „1 member" (real 3), Experten/Coaches unsichtbar (Screenshot 40).
- **Segment-Count-Muster gemischt:** Sessions/Notifications `Label (N)` vs. Videos `3 VIDEOS`-Overline — Handoff-Open-Question, aber beide gleichzeitig ist keine Antwort.
- **Notification-Rows:** einzeilig truncated („…booked a session wit…" auf jeder Zeile); Datum absolut + US-Format. Kommentar-Footer ebenso absolut statt relativ (Handoff-Spec „2h ago") und Datum/Zeit generell per Device-Locale statt `i18n.language` (`datetime.ts:26`).
- **Availability-Sessions-Karte** mit großem Leerraum unter dem einzigen Eintrag (Screenshot 13, mutmaßlich Layout-/Höhenproblem).
- **Sheet-Radius 16 statt 28** (`_layout.tsx:152,166,182`), **`WEB_BASE`-Fallback `http://localhost:4200`** für Invite-Links (`group/[id].tsx:45`), Booking-Bar zeigt auf Schritt 1–2 den Step-Prompt statt laufendem Kontext.

## Low/Nits (Auswahl)

Struktur: `z-combobox.ios/.android` byte-identisch → `shared` extrahieren; jest-`moduleNameMapper` (~80 Zeilen) aus Array generieren; ungenutzte Deps `expo-device`/`expo-glass-effect`/`expo-status-bar` (+ `burnt` beim nächsten Native-Rebuild); `availability.tsx` 932 Zeilen (3 Inline-Sheets extrahieren); Doppel-Invalidierung Child+Prefix; 4× dupliziertes Tab-Chrome-Wiring → `useTabChrome()`; unerreichbares `ZToastAction`-Plumbing; Repo-Hygiene: `mobile/.env.bak.111311` (+ `.gitignore` auf `.env*`), `handoff-impressum.jpeg`/`our-imprint.jpeg`/`docs/businessplan.*` entscheiden, `run-android-emulator.sh` committen.

Handoff: Stepper ohne iOS-Page-Dots + lucide-`Check` statt ZSymbol + `.types.ts`-Drift (`reached` fehlt); tabular-nums fehlt in ZTimeGrid/ZDateRail/ZBookingBar; ZSwitch off-Track `outline` statt surface-4; Feld-Fill `bg-background` statt surface; Buchung ohne Erfolgs-Toast (Spec sagt beibehalten — Full-Screen-Success ist vertretbar, dokumentieren); dark `accentStrong`/`onAccent` weichen dokumentiert (AA) von README ab → README nachziehen.

UX: Invite-Error unterscheidet 404/Netz nicht; „Alle gelesen" ohne Fehler-Feedback; Call-Permission-Sackgasse bei `canAskAgain=false` (→ `Linking.openSettings()`); Accept/Decline ohne pending-disabled (Doppel-Tap); `updateCurrentUser` ohne try/finally (Save-Button kann dauerhaft hängen); Review-Thread `.map()` unbounded im ScrollView (→ FlatList, löst auch fehlendes KAV am Composer); Empty/Error außerhalb FlatList → kein Pull-to-Refresh im Leerzustand (videos/groups); hardcodierte Literale: `student@example.com`, `· {n} min`, `accessibilityLabel="Close"`; `startTimeRequired`-Meldung falsch wenn Endzeit fehlt; Badge-Copy „upcoming" lowercase vs. „Reviewed"; Upload-Dropzone = Desktop-Metapher; Zeit-Step ohne Datums-Vorauswahl.

## Was gut ist

- **Booking-Flow strukturell mustergültig** (auch im Emulator): navigierbarer Stepper mit `reached`-Gate, ZBookingBar außerhalb der ScrollView mit disabled/loading, Dauer statt Preis (Schema-Disziplin), 409→Zeit-Step-Rückführung, Success-State mit Summary + Add-to-calendar.
- **Token-Treue:** roles.ts light+dark 1:1 zur README (2 dokumentierte AA-Ausnahmen); secondary-container-Selektionssprache konsistent durch Chip/Segment/ListItem/Nav-Pill/tonal-Button; Seek-Chip, Video-Part-Rail (1/2–5/>5-Disclosure) und Meta-Block exakt nach Spec.
- **Staaten-Disziplin & Sicherheit:** pending/error/empty/data fast überall in korrekter Reihenfolge, destruktive Aktionen durchgängig ZConfirmDialog/formSheet, i18n de/en/fr 632/632/632 ohne fehlende Keys, Architektur-Regeln mechanisch enforced (primitive-contract-Test, className-Forwarding-Scan, Self-Import-Ban), `upload-store` bewusst und sauber getestet.

## Nicht abgedeckt

Call-Screen (braucht laufende Session), `group/create`, `select/[field]`, Personal-data-Screen, Invite-QR nach Erstellen, DE/FR-Sprachwechsel visuell, Dark Mode visuell, iOS komplett (nur Android-Emulator). Screenshots liegen im Session-Scratchpad (temporär): `…\scratchpad\00–40_*.png`.

## Fix-Durchlauf (2026-07-02, gleiche Session)

Alle Punkte der empfohlenen Reihenfolge umgesetzt und verifiziert (817/817 Jest, 113/113 Suiten, Go-Build+Tests grün, Emulator-Nachweis für Statusbar/Hero-CTA/Sheet-Header/Cancel-Sheet/Toast/Segment-Counts/First-Steps/Profile-Tab/Datums-Vorauswahl). Wesentliche Umsetzungen:

- **C1–C3:** `add-to-calendar.ts` + Emulator-Skript getrackt; Logout nutzt `openAuthSessionAsync` + neues Backend-Env `MOBILE_LOGOUT_RETURN_TO` (WorkOS-Whitelist nötig, s.u.); Callback-Fehler landen sichtbar auf /login (`?error=exchange`).
- **Android sichtbar:** neue [SheetHeader](../../mobile/src/components/sheet-header.tsx)-Komponente (Android-only) für upload/book/cancel; ZButton rendert Leading-Node-Fälle über den RN-Pfad (Function-Style-Falle: NativeWind schluckt Style-Funktionen auf Pressable → statisches Style-Objekt); `StatusBar style="auto"`; Toast 96dp über der Tab-Bar; Inputs 56dp + 2dp-Accent-Focus (Padding-Kompensation).
- **Datenfrische:** focusManager↔AppState; Home-RefreshControl + Fehler-Slot; Composer in KAV.
- **Copy:** 51 EN-Werte sentence-cased (Web+Mobile synchron von Hand, `sync:i18n` gemieden); Tab „Profile"; Videos-Segmente `Label (N)`; Notification-Titel 2-zeilig; Badges kapitalisiert; Videos-Titel neutral.
- **Majors:** Header/Sheet-Chrome scheme-aware (`useTabScreenOptions`-Hook, `headerChrome` aus Role-Tokens); `localDateKey` statt `toISOString` (UTC-Off-by-one); Screenreader-Cancel-Button (RNGH-Action existiert nicht im A11y-Tree); Kommentar-Zählung = Gesamtthread; First-Steps-Gates auf `groups:create`/`reviews:create`.
- **Nits:** Toast-Beschreibungen (neue Keys ×6 Dateien), Invite-Retry refetcht, Call-Sackgasse → `Linking.openSettings()`, try/finally-Saves, endTime-Fehlermeldung, Reports-keyExtractor, Sheet-Radius 28, Stepper→ZSymbol+Types-Sync, tabular-nums, ListEmptyComponent (videos/groups), Datums-Vorauswahl im Buchungsflow, `.gitignore .env*`, README-Token-Fußnote.

**Offen / bewusst nicht gemacht:** Dep-Removal (`expo-device`, `expo-glass-effect`, `burnt`) an den nächsten Native-Rebuild gekoppelt; iOS-Stepper-Dots (kein iOS-Gerät in der Session); Feld-Fill bg-surface (Regression-Risiko auf Karten); Icon-Tints in Screens weiter light-gepinnt (Chrome ist scheme-aware — Rest-Sweep als Folgeaufgabe); `z-combobox`-Dedup/jest-Mapper/`availability.tsx`-Split/ZToastAction (reine Refactors); Root-JPEGs + `businessplan.*` (User-Dateien, Entscheidung offen). **Nutzeraktion nötig:** `zeta://login` als WorkOS-Logout-Redirect-URI whitelisten + `MOBILE_LOGOUT_RETURN_TO=zeta://login` im Backend-Env setzen, sonst bleibt der Logout-Tab auf der Dashboard-Default-URL (Verhalten wie vorher). iOS-Smoke-Test der Sheet-Header steht aus.

## Empfohlene Reihenfolge

1. C1 committen (1 Befehl), C2 Logout-Redirect-URL (Env/WorkOS-Konfig), C3 Fehlerpfad im Callback sichtbar machen.
2. Android-Sichtbares: formSheet-Header-Ersatz, Hero-CTA (Icon in Custom-RN-Pfad oder Label ohne Icon), Statusbar-Style, Toast-Offset über Tab-Bar, Input-Focus-Ring.
3. Datenfrische-Paket: focusManager+AppState, Home-RefreshControl, Home-isError.
4. Copy-Paket: EN sentence case in Web-JSONs + sync, Tab-Label „Profile", Segment-Count-Muster vereinheitlichen, Notification-Rows 2-zeilig.
5. Rest nach Gusto (Nits-Liste oben).
