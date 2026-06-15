/**
 * ZStepper — shared public API types (Tier: Custom-RN)
 *
 * ZStepper is a Custom-RN primitive: no OS-widget equivalent for a horizontal
 * multi-step progress indicator. Rendered via NativeWind with role tokens.
 *
 * Platform files:
 *   - z-stepper.tsx — single shared NativeWind implementation (web / iOS / Android / jest)
 *
 * No .ios.tsx / .android.tsx — not applicable (no native widget equivalent).
 */

export type ZStepState = 'completed' | 'active' | 'upcoming';

export type ZStep = {
  /** Already-translated step label shown below the step circle. */
  label: string;
  state: ZStepState;
};

export type ZStepperProps = {
  steps: ZStep[];
  /** Called when the user taps a completed or active step circle. */
  onStepPress?: (index: number) => void;
  testID?: string;
};
