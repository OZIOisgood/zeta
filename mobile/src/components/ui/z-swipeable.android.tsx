// ZSwipeable — Android entry. The swipe gesture is platform-identical (RNGH
// ReanimatedSwipeable), so Android and iOS both re-export the shared native
// impl. Source is './z-swipeable.shared' — NOT './z-swipeable', which Metro
// resolves back to this file → infinite re-export ("Maximum call stack size
// exceeded"), per the self-import ban in mobile/AGENTS.md.
export { ZSwipeable } from './z-swipeable.shared';
export type { ZSwipeableProps } from './z-swipeable.types';
