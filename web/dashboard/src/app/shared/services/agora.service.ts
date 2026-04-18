import { Injectable, signal } from '@angular/core';
import AgoraRTC, {
  IAgoraRTCClient,
  ICameraVideoTrack,
  IMicrophoneAudioTrack,
  IRemoteAudioTrack,
  IRemoteVideoTrack,
} from 'agora-rtc-sdk-ng';

@Injectable({ providedIn: 'root' })
export class AgoraService {
  private client: IAgoraRTCClient | null = null;

  readonly localAudioTrack = signal<IMicrophoneAudioTrack | null>(null);
  readonly localVideoTrack = signal<ICameraVideoTrack | null>(null);
  readonly remoteAudioTrack = signal<IRemoteAudioTrack | null>(null);
  readonly remoteVideoTrack = signal<IRemoteVideoTrack | null>(null);

  async join(appId: string, channel: string, token: string, uid: number): Promise<void> {
    const client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
    this.client = client;

    client.on('user-published', async (user, mediaType) => {
      await client.subscribe(user, mediaType);
      if (mediaType === 'audio') {
        this.remoteAudioTrack.set(user.audioTrack ?? null);
        user.audioTrack?.play();
      }
      if (mediaType === 'video') {
        this.remoteVideoTrack.set(user.videoTrack ?? null);
      }
    });

    client.on('user-unpublished', (_user, mediaType) => {
      if (mediaType === 'audio') {
        this.remoteAudioTrack.set(null);
      }
      if (mediaType === 'video') {
        this.remoteVideoTrack.set(null);
      }
    });

    client.on('user-left', () => {
      this.remoteAudioTrack.set(null);
      this.remoteVideoTrack.set(null);
    });

    await client.join(appId, channel, token, uid);

    const [audioTrack, videoTrack] = await AgoraRTC.createMicrophoneAndCameraTracks();
    await client.publish([audioTrack, videoTrack]);

    this.localAudioTrack.set(audioTrack);
    this.localVideoTrack.set(videoTrack);
  }

  toggleAudio(): boolean {
    const track = this.localAudioTrack();
    if (!track) return false;
    track.setEnabled(!track.enabled);
    return track.enabled;
  }

  toggleVideo(): boolean {
    const track = this.localVideoTrack();
    if (!track) return false;
    track.setEnabled(!track.enabled);
    return track.enabled;
  }

  async leave(): Promise<void> {
    this.localAudioTrack()?.close();
    this.localVideoTrack()?.close();
    await this.client?.leave();
    this.client = null;
    this.localAudioTrack.set(null);
    this.localVideoTrack.set(null);
    this.remoteAudioTrack.set(null);
    this.remoteVideoTrack.set(null);
  }
}
