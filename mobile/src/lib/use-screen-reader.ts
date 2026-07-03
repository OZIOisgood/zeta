import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

/**
 * Whether a screen reader is currently active. Swipe-revealed actions are not
 * reachable under TalkBack/VoiceOver (the gesture is unperformable and the
 * hidden action is absent from the a11y tree) — rows with swipe actions render
 * an explicit visible button instead while this is true.
 */
export function useScreenReader(): boolean {
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    let alive = true;
    void AccessibilityInfo.isScreenReaderEnabled().then((on) => {
      if (alive) setEnabled(on);
    });
    const sub = AccessibilityInfo.addEventListener('screenReaderChanged', setEnabled);
    return () => {
      alive = false;
      sub.remove();
    };
  }, []);
  return enabled;
}
