export type CallEngineEvents = {
  onRemoteUserJoined: (uid: number) => void;
  onRemoteUserLeft: (uid: number) => void;
  onError: (message: string) => void;
};

export type CallEngine = {
  join: (appId: string, channel: string, token: string, uid: number) => Promise<void>;
  leave: () => Promise<void>;
  setMicMuted: (muted: boolean) => void;
  setCameraEnabled: (enabled: boolean) => void;
  switchCamera: () => void;
};

/** Web/Expo Go stub — live calls need the native development build. */
export function createCallEngine(_events: CallEngineEvents): CallEngine {
  throw new Error('Live calls require the native development build.');
}
