/**
 * Lightweight jest mock for react-native-reanimated v4.
 * Reanimated relies on a native worklets runtime that is unavailable in jest.
 * This mock stubs out the animation hooks so components using them render
 * correctly in tests without any animation side-effects.
 */
import React from 'react';
import { View, Text, Image, ScrollView, FlatList } from 'react-native';

const NOOP = () => {};
const ID = (x: unknown) => x;

// Shared value: a plain object whose `.value` is the initial value.
// Assignments to `.value` are synchronous and no-op in tests.
function useSharedValue<T>(initial: T) {
  return { value: initial };
}

// Animated style: evaluate the worklet synchronously and return the result.
// The worklet receives shared values but they will just return their initial.
function useAnimatedStyle(worklet: () => object) {
  try {
    return worklet();
  } catch {
    return {};
  }
}

// Animation helpers — synchronous identity in tests.
const withTiming = (toValue: unknown) => toValue;
const withRepeat = (animation: unknown) => animation;
const withSequence = (...animations: unknown[]) => animations[animations.length - 1];
const withDelay = (_delay: number, animation: unknown) => animation;
const withSpring = (toValue: unknown) => toValue;

const Easing = {
  inOut: (_e: unknown) => ID,
  in: (_e: unknown) => ID,
  out: (_e: unknown) => ID,
  ease: ID,
  linear: ID,
  quad: ID,
  cubic: ID,
  poly: (_n: number) => ID,
  sin: ID,
  circle: ID,
  exp: ID,
  elastic: (_bounciness?: number) => ID,
  bounce: ID,
  bezier: () => ID,
  bezierFn: () => ID,
  steps: () => ID,
  back: () => ID,
};

// Animated host components: render as their RN equivalents in tests.
const Animated = {
  View,
  Text,
  Image,
  ScrollView,
  FlatList,
  createAnimatedComponent: (Component: React.ComponentType<unknown>) => Component,
};

export default Animated;
export {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  withDelay,
  withSpring,
  Easing,
  Animated,
};

// Additional exports that might be imported.
export const useAnimatedProps = (worklet: () => object) => {
  try { return worklet(); } catch { return {}; }
};
export const useAnimatedRef = () => ({ current: null });
export const useAnimatedScrollHandler = () => NOOP;
export const useDerivedValue = (fn: () => unknown) => {
  try { return { value: fn() }; } catch { return { value: undefined }; }
};
export const useAnimatedReaction = NOOP;
export const runOnUI = (fn: unknown) => fn;
export const runOnJS = (fn: unknown) => fn;
export const cancelAnimation = NOOP;
export const measure = () => null;
export const scrollTo = NOOP;
export const interpolate = (value: number) => value;
export const interpolateColor = (value: number) => value;
export const Extrapolation = { CLAMP: 'clamp', IDENTITY: 'identity', EXTEND: 'extend' };
export const ReduceMotion = { System: 'system', Always: 'always', Never: 'never' };
export const FadeIn = {};
export const FadeOut = {};
export const Layout = {};
