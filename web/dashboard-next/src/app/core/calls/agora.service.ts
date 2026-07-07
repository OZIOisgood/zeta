import { Injectable, signal } from '@angular/core';
import type {
  IAgoraRTCClient,
  ICameraVideoTrack,
  IMicrophoneAudioTrack,
  IRemoteAudioTrack,
  IRemoteVideoTrack,
} from 'agora-rtc-sdk-ng/esm';

@Injectable({ providedIn: 'root' })
export class AgoraService {
  private client: IAgoraRTCClient | null = null;
  private agoraModule: typeof import('agora-rtc-sdk-ng/esm') | null = null;

  readonly localAudioTrack = signal<IMicrophoneAudioTrack | null>(null);
  readonly localVideoTrack = signal<ICameraVideoTrack | null>(null);
  readonly remoteAudioTrack = signal<IRemoteAudioTrack | null>(null);
  readonly remoteVideoTrack = signal<IRemoteVideoTrack | null>(null);
  readonly audioDevices = signal<MediaDeviceInfo[]>([]);
  readonly videoDevices = signal<MediaDeviceInfo[]>([]);
  readonly selectedAudioDeviceId = signal('');
  readonly selectedVideoDeviceId = signal('');
  readonly audioEnabled = signal(true);
  readonly videoEnabled = signal(true);

  async join(appId: string, channel: string, token: string, uid: number): Promise<void> {
    const AgoraRTC = await this.loadAgora();
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
      if (mediaType === 'audio') this.remoteAudioTrack.set(null);
      if (mediaType === 'video') this.remoteVideoTrack.set(null);
    });

    client.on('user-left', () => {
      this.remoteAudioTrack.set(null);
      this.remoteVideoTrack.set(null);
    });

    await client.join(appId, channel, token, uid);

    await this.loadDevices();

    const [audioResult, videoResult] = await Promise.allSettled([
      AgoraRTC.createMicrophoneAudioTrack(),
      AgoraRTC.createCameraVideoTrack(),
    ]);
    const audioTrack = audioResult.status === 'fulfilled' ? audioResult.value : null;
    const videoTrack = videoResult.status === 'fulfilled' ? videoResult.value : null;
    if (audioTrack) await client.publish(audioTrack);
    if (videoTrack) await client.publish(videoTrack);

    this.localAudioTrack.set(audioTrack);
    this.localVideoTrack.set(videoTrack);
    this.audioEnabled.set(!!audioTrack);
    this.videoEnabled.set(!!videoTrack);

    const audioDeviceId = audioTrack?.getMediaStreamTrack().getSettings().deviceId;
    const videoDeviceId = videoTrack?.getMediaStreamTrack().getSettings().deviceId;
    if (audioDeviceId) this.selectedAudioDeviceId.set(audioDeviceId);
    if (videoDeviceId) this.selectedVideoDeviceId.set(videoDeviceId);
  }

  async loadDevices(): Promise<void> {
    const AgoraRTC = await this.loadAgora();
    const devices = await AgoraRTC.getDevices();
    this.audioDevices.set(devices.filter((device) => device.kind === 'audioinput'));
    this.videoDevices.set(devices.filter((device) => device.kind === 'videoinput'));
  }

  async setAudioDevice(deviceId: string): Promise<void> {
    const track = this.localAudioTrack();
    if (!track) return;
    await track.setDevice(deviceId);
    this.selectedAudioDeviceId.set(deviceId);
  }

  async setVideoDevice(deviceId: string): Promise<void> {
    const track = this.localVideoTrack();
    if (!track) return;
    await track.setDevice(deviceId);
    this.selectedVideoDeviceId.set(deviceId);
  }

  async toggleAudio(): Promise<void> {
    const track = this.localAudioTrack();
    if (!track) return;
    const next = !this.audioEnabled();
    await track.setEnabled(next);
    this.audioEnabled.set(next);
  }

  async toggleVideo(): Promise<void> {
    const track = this.localVideoTrack();
    if (!track) return;
    const next = !this.videoEnabled();
    await track.setEnabled(next);
    this.videoEnabled.set(next);
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
    this.audioDevices.set([]);
    this.videoDevices.set([]);
    this.selectedAudioDeviceId.set('');
    this.selectedVideoDeviceId.set('');
    this.audioEnabled.set(true);
    this.videoEnabled.set(true);
  }

  private async loadAgora(): Promise<typeof import('agora-rtc-sdk-ng/esm')> {
    this.agoraModule ??= await import('agora-rtc-sdk-ng/esm');
    return this.agoraModule;
  }
}
