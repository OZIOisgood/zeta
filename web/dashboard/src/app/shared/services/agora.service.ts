import { Injectable, signal } from '@angular/core';
import AgoraRTC, {
  IAgoraRTCClient,
  ICameraVideoTrack,
  IMicrophoneAudioTrack,
  IRemoteAudioTrack,
  IRemoteVideoTrack,
  UID,
} from 'agora-rtc-sdk-ng';

export interface RemoteUser {
  uid: UID;
  audio: IRemoteAudioTrack | null;
  video: IRemoteVideoTrack | null;
}

@Injectable({
  providedIn: 'root',
})
export class AgoraService {
  private client: IAgoraRTCClient | null = null;
  private localMicTrack: IMicrophoneAudioTrack | null = null;
  private localVideoTrack: ICameraVideoTrack | null = null;

  readonly channelJoined = signal(false);
  readonly micEnabled = signal(true);
  readonly cameraEnabled = signal(true);
  readonly remoteUsers = signal<Map<UID, RemoteUser>>(new Map());

  async joinChannel(appId: string, channel: string, token: string, uid: number): Promise<void> {
    this.client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });

    // Register event listeners BEFORE joining
    this.client.on('user-published', async (user, mediaType) => {
      if (!this.client) return;
      await this.client.subscribe(user, mediaType);

      const users = new Map(this.remoteUsers());
      const existing = users.get(user.uid) || { uid: user.uid, audio: null, video: null };

      if (mediaType === 'audio') {
        existing.audio = user.audioTrack || null;
        user.audioTrack?.play();
      }
      if (mediaType === 'video') {
        existing.video = user.videoTrack || null;
      }

      users.set(user.uid, existing);
      this.remoteUsers.set(users);
    });

    this.client.on('user-unpublished', (user, mediaType) => {
      const users = new Map(this.remoteUsers());
      const existing = users.get(user.uid);
      if (existing) {
        if (mediaType === 'audio') existing.audio = null;
        if (mediaType === 'video') existing.video = null;
        users.set(user.uid, existing);
        this.remoteUsers.set(users);
      }
    });

    this.client.on('user-left', (user) => {
      const users = new Map(this.remoteUsers());
      users.delete(user.uid);
      this.remoteUsers.set(users);
    });

    await this.client.join(appId, channel, token, uid);
    this.channelJoined.set(true);

    // Create and publish local tracks
    [this.localMicTrack, this.localVideoTrack] = await AgoraRTC.createMicrophoneAndCameraTracks();
    await this.client.publish([this.localMicTrack, this.localVideoTrack]);
  }

  async leaveChannel(): Promise<void> {
    this.localMicTrack?.close();
    this.localVideoTrack?.close();
    this.localMicTrack = null;
    this.localVideoTrack = null;

    if (this.client) {
      await this.client.leave();
      this.client = null;
    }

    this.channelJoined.set(false);
    this.remoteUsers.set(new Map());
    this.micEnabled.set(true);
    this.cameraEnabled.set(true);
  }

  async toggleMic(): Promise<void> {
    if (this.localMicTrack) {
      const enabled = !this.micEnabled();
      await this.localMicTrack.setEnabled(enabled);
      this.micEnabled.set(enabled);
    }
  }

  async toggleCamera(): Promise<void> {
    if (this.localVideoTrack) {
      const enabled = !this.cameraEnabled();
      await this.localVideoTrack.setEnabled(enabled);
      this.cameraEnabled.set(enabled);
    }
  }

  playLocalVideo(element: HTMLElement): void {
    this.localVideoTrack?.play(element);
  }

  playRemoteVideo(uid: UID, element: HTMLElement): void {
    const user = this.remoteUsers().get(uid);
    user?.video?.play(element);
  }

  async getDevices(): Promise<{ audio: MediaDeviceInfo[]; video: MediaDeviceInfo[] }> {
    const devices = await AgoraRTC.getDevices();
    return {
      audio: devices.filter((d) => d.kind === 'audioinput'),
      video: devices.filter((d) => d.kind === 'videoinput'),
    };
  }

  async setAudioDevice(deviceId: string): Promise<void> {
    if (this.localMicTrack) {
      await this.localMicTrack.setDevice(deviceId);
    }
  }

  async setVideoDevice(deviceId: string): Promise<void> {
    if (this.localVideoTrack) {
      await this.localVideoTrack.setDevice(deviceId);
    }
  }
}
