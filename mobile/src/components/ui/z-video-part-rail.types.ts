/**
 * ZVideoPartRail — shared public API types (Tier: Custom-RN)
 *
 * A clip switcher attached to the player (episode-picker pattern), not a
 * standalone card. Progressive disclosure: nothing renders for a single clip,
 * a subtle pill row for 2–5 clips, and a compact trigger + bottom sheet for
 * many (>5) clips.
 *
 * Tier rationale: Composition. The pill row and the >5 trigger are Custom-RN
 * (NativeWind pills/buttons — no OS widget maps to a flush "episode picker"
 * under a video player), and the overflow sheet composes the existing native
 * `ZDialogPanel` primitive (whose own platform split provides the native
 * SwiftUI/Compose sheet). The rail itself has no platform files of its own, so
 * it is classified `custom-no-native` (the canonical alias for Custom-RN /
 * composition primitives without a platform split — same as ZDangerZoneCard).
 *
 * This `.tsx` is the single implementation file (no .ios/.android variants):
 *   - z-video-part-rail.tsx — NativeWind pills/trigger + ZDialogPanel sheet
 *
 * Decoupled from the API shape on purpose: the screen maps `AssetVideo` rows to
 * `{ id, ready }`, so the rail never imports the OpenAPI schema. There is NO
 * per-part duration — the real `AssetVideo` has no duration/label, so pills and
 * sheet rows show only "Teil N" + ready/processing status.
 */

export type ZVideoPart = {
  /** Stable clip id (the AssetVideo row id). */
  id: string;
  /** Whether the clip has finished processing and can be played. */
  ready: boolean;
};

export type ZVideoPartRailProps = {
  /** Ordered clips of the upload. Index drives the "Teil N" label. */
  parts: ZVideoPart[];
  /** Currently active clip id (the one the player is showing). */
  activeId: string | null;
  /** Called with the clip id when the user selects a different (ready) clip. */
  onChange: (id: string) => void;
  /** Test identifier forwarded to the rail container. */
  testID?: string;
};
