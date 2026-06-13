// Jest/web stub for react-native-agora.
// The native .ts implementation imports this package; this mock prevents
// the "package not linked" error when the test runner processes .native.ts files.
// RtcSurfaceView is also stubbed so call-view.native.tsx renders without errors in tests.

import React from 'react';
import { View } from 'react-native';

export const ChannelProfileType = {
  ChannelProfileCommunication: 0,
  ChannelProfileLiveBroadcasting: 1,
};

export const ClientRoleType = {
  ClientRoleBroadcaster: 1,
  ClientRoleAudience: 2,
};

export function createAgoraRtcEngine() {
  throw new Error('react-native-agora is not available in jest/web');
}

/** Stub view component — renders a plain View in tests. */
export class RtcSurfaceView extends React.Component<{ canvas: { uid: number }; style?: object }> {
  render() {
    return React.createElement(View, { testID: `rtc-surface-view-${this.props.canvas.uid}` });
  }
}

export class RtcTextureView extends React.Component<{ canvas: { uid: number }; style?: object }> {
  render() {
    return React.createElement(View, { testID: `rtc-texture-view-${this.props.canvas.uid}` });
  }
}
