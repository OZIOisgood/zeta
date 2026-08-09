import {
  createAgoraRtcEngine,
  ChannelProfileType,
  ClientRoleType,
  type IRtcEngine,
  type IRtcEngineEventHandler,
} from 'react-native-agora';
import type { CallEngine, CallEngineEvents } from './call-engine';

export type { CallEngineEvents, CallEngine };
export { createCallEngine };

const JOIN_TIMEOUT_MS = 15_000;

function createCallEngine(events: CallEngineEvents): CallEngine {
  let engine: IRtcEngine | null = null;
  let handler: IRtcEngineEventHandler | null = null;

  const join = (appId: string, channel: string, token: string, uid: number): Promise<void> => {
    return new Promise<void>((resolve, reject) => {
      let settled = false;
      const timeout = setTimeout(() => {
        if (!settled) {
          settled = true;
          reject(new Error('Call join timed out'));
        }
      }, JOIN_TIMEOUT_MS);

      handler = {
        onJoinChannelSuccess: () => {
          if (!settled) {
            settled = true;
            clearTimeout(timeout);
            resolve();
          }
        },
        onError: (_err: number, msg: string) => {
          if (!settled) {
            settled = true;
            clearTimeout(timeout);
            reject(new Error(msg));
          }
          events.onError(msg);
        },
        onUserJoined: (_connection, remoteUid: number) => {
          events.onRemoteUserJoined(remoteUid);
        },
        onUserOffline: (_connection, remoteUid: number) => {
          events.onRemoteUserLeft(remoteUid);
        },
      };

      engine = createAgoraRtcEngine();
      engine.initialize({
        appId,
        channelProfile: ChannelProfileType.ChannelProfileCommunication,
      });
      engine.registerEventHandler(handler);
      engine.enableVideo();
      engine.startPreview();
      engine.joinChannel(token, channel, uid, {
        clientRoleType: ClientRoleType.ClientRoleBroadcaster,
      });
    });
  };

  const leave = async (): Promise<void> => {
    if (!engine) return;
    try {
      engine.leaveChannel();
      if (handler) {
        engine.unregisterEventHandler(handler);
        handler = null;
      }
      engine.release();
    } finally {
      engine = null;
    }
  };

  const setMicMuted = (muted: boolean): void => {
    engine?.muteLocalAudioStream(muted);
  };

  const setCameraEnabled = (enabled: boolean): void => {
    engine?.enableLocalVideo(enabled);
  };

  const switchCamera = (): void => {
    engine?.switchCamera();
  };

  return { join, leave, setMicMuted, setCameraEnabled, switchCamera };
}
