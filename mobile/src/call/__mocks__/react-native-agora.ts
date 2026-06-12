// Jest/web stub for react-native-agora.
// The native .ts implementation imports this package; this mock prevents
// the "package not linked" error when the test runner processes .native.ts files.

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
