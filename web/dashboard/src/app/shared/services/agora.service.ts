import { Injectable } from '@angular/core';
import AgoraRTC, {
  IAgoraRTCClient,
  ICameraVideoTrack,
  IMicrophoneAudioTrack,
  IRemoteAudioTrack,
  IRemoteVideoTrack,
} from 'agora-rtc-sdk-ng';

export interface AgoraState {
  client: IAgoraRTCClient | null;
  localAudioTrack: IMicrophoneAudioTrack | null;
  localVideoTrack: ICameraVideoTrack | null;
  remoteAudioTrack: IRemoteAudioTrack | null;
  remoteVideoTrack: IRemoteVideoTrack | null;
}

@Injectable({ providedIn: 'root' })
export class AgoraService {
  private state: AgoraState = {
    client: null,
    localAudioTrack: null,
    localVideoTrack: null,
    remoteAudioTrack: null,
    remoteVideoTrack: null,
  };

  async join(appId: string, channel: string, token: string, uid: number): Promise<AgoraState> {
    const client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });

    client.on('user-published', async (user, mediaType) => {
      await client.subscribe(user, mediaType);
      if (mediaType === 'audio') {
        this.state.remoteAudioTrack = user.audioTrack ?? null;
        user.audioTrack?.play();
      }
      if (mediaType === 'video') {
        this.state.remoteVideoTrack = user.videoTrack ?? null;
      }
    });

    client.on('user-unpublished', (_user, mediaType) => {
      if (mediaType === 'audio') {
        this.state.remoteAudioTrack = null;
      }
      if (mediaType === 'video') {
        this.state.remoteVideoTrack = null;
      }
    });

    await client.join(appId, channel, token, uid);

    const [audioTrack, videoTrack] = await AgoraRTC.createMicrophoneAndCameraTracks();
    await client.publish([audioTrack, videoTrack]);

    this.state = {
      client,
      localAudioTrack: audioTrack,
      localVideoTrack: videoTrack,
      remoteAudioTrack: null,
      remoteVideoTrack: null,
    };

    return this.state;
  }

  getState(): AgoraState {
    return this.state;
  }

  toggleAudio(): boolean {
    const track = this.state.localAudioTrack;
    if (!track) return false;
    track.setEnabled(!track.enabled);
    return track.enabled;
  }

  toggleVideo(): boolean {
    const track = this.state.localVideoTrack;
    if (!track) return false;
    track.setEnabled(!track.enabled);
    return track.enabled;
  }

  async leave(): Promise<void> {
    this.state.localAudioTrack?.close();
    this.state.localVideoTrack?.close();
    await this.state.client?.leave();
    this.state = {
      client: null,
      localAudioTrack: null,
      localVideoTrack: null,
      remoteAudioTrack: null,
      remoteVideoTrack: null,
    };
  }
}
