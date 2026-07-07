# Android-FABs zu hoch: doppelte Tab-Bar-Clearance

**Datum:** 2026-07-07 · **Branch:** `feat/mobile-token-auth` · **Melder:** Heinrich (Gerät, Videos-Tab)

## Befund

Alle Android-FABs schwebten ~80–120dp über der Tab-Bar; Listen hatten toten Leerraum am Ende. Ursache: Alle fünf Tab-Screens rechneten `insets.bottom + ANDROID_TAB_BAR_HEIGHT(56)` auf FAB-`bottom` und Listen-`paddingBottom`, gestützt auf die (in z-screen.tsx dokumentierte) Annahme, NativeTabs melde seine Höhe nicht ans RN-Layout und der Content liege HINTER der Bar.

**uiautomator-Ground-Truth (Emulator 1080×2400 @2.625x):** Der RN-Content endet exakt an der Bar-Oberkante (2125), die M3-NavigationBar ist 80dp hoch (nicht 56) und absorbiert den System-Inset selbst. Der react-native-screens-Bottom-Tabs-Host layoutet den Content ÜBER der Bar — es liegt nichts dahinter. FAB-Messung vorher: 96dp über Content-Ende (= 24+56+16, exakt die Doppelrechnung); nachher: ~16dp.

## Fix (`973b71a`)

- FABs ankern mit `className="absolute bottom-4 right-6"` (16dp über der Bar), keine Inset-/Bar-Mathematik mehr.
- Listen-Clearance nur noch dort, wo ein FAB die letzte Zeile verdecken kann: neue Konstante `ANDROID_FAB_LIST_CLEARANCE = 72` (FAB 56 + 16 Margin, M3 „list with FAB") in `mobile/src/lib/android-fab-clearance.ts` — genutzt von Videos/Gruppen/Termine; Home/Profil (kein FAB) auf schlichtes `paddingBottom: 16`.
- Falsche Annahme in `z-screen.tsx`-Kontraktdoku korrigiert; per-Screen-Konstanten `ANDROID_TAB_BAR_HEIGHT` entfernt; `useSafeAreaInsets` aus den fünf Screens entfernt (einziger Nutzer war die Doppelrechnung).

## Verifikation

Emulator (frisches Bundle): Videos-FAB [570,1960][1025,2088] → 15dp über Bar-Oberkante ✓, Gruppen-FAB ebenso ✓. Gates: tsc sauber, Lint 0 Errors, Jest 819/819. iOS unberührt (contentInsetAdjustmentBehavior; FABs sind Android-only).
