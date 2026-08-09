# Strido — Mobile UI Kit

High-fidelity, click-through recreation of the Strido mobile app (Expo / React
Native in production; this kit is an HTML/React mirror for design work).

## Files
- `index.html` — the phone shell: status bar, native-style bottom tab bar, stack
  navigation, and the floating action button. Mounts the screens. **This is the
  card preview + the file to open.**
- `screens.jsx` — every screen + shared pieces (`Login`, `Home`, `Videos`,
  `AssetDetail`, `Sessions`, `Call`, `Groups`, `Profile`, plus `Icon`/`NavHeader`).
  Composes the design-system primitives from `window.StridoDesignSystem_dc14ef`.
- `data.js` — sample equestrian content (riders, groups, videos, reviews, bookings).

## Flow
Opens on **Sign in** → tap to enter the app. Bottom tabs switch between Home,
Videos, Sessions, Groups, Profile. Tapping a video pushes the **asset detail**
(player + timestamped review thread + composer). On Sessions, **Join** on an
upcoming booking opens the full-bleed **live call** screen with mic/camera
controls. The FAB adds a video (Videos) or books a session (Sessions).

## Notes
- Icons are Lucide via CDN (the app uses `lucide-react-native`).
- The video surfaces are dark placeholders with real player chrome — no drawn
  imagery. Drop a real thumbnail/poster in if you have one.
- Primitives are NOT re-implemented here; they come from the compiled bundle, so
  the kit always tracks the live components.
