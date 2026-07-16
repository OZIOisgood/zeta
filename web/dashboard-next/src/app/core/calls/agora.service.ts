import { Injectable, signal } from '@angular/core';
import type {
  IAgoraRTCClient,
  IAgoraRTCRemoteUser,
  ICameraVideoTrack,
  IMicrophoneAudioTrack,
  UID,
} from 'agora-rtc-sdk-ng/esm';
import { RemoteParticipantState } from './coaching-call.types';

export type AgoraMediaError =
  | 'permission_denied'
  | 'device_missing'
  | 'device_busy'
  | 'unsupported'
  | 'publish_failed'
  | 'network';

@Injectable({ providedIn: 'root' })
export class AgoraService {
  private client: IAgoraRTCClient | null = null;
  private agoraModule: typeof import('agora-rtc-sdk-ng/esm') | null = null;
  private expectedRemoteUIDs = new Set<number>();
  private audioEnablePromise: Promise<void> | null = null;
  private videoEnablePromise: Promise<void> | null = null;
  private leavePromise: Promise<void> | null = null;

  readonly localAudioTrack = signal<IMicrophoneAudioTrack | null>(null);
  readonly localVideoTrack = signal<ICameraVideoTrack | null>(null);
  readonly remoteParticipants = signal<ReadonlyMap<number, RemoteParticipantState>>(new Map());
  readonly audioDevices = signal<MediaDeviceInfo[]>([]);
  readonly videoDevices = signal<MediaDeviceInfo[]>([]);
  readonly selectedAudioDeviceId = signal('');
  readonly selectedVideoDeviceId = signal('');
  readonly audioEnabled = signal(false);
  readonly videoEnabled = signal(false);
  readonly localJoined = signal(false);
  readonly connectionState = signal<'disconnected' | 'connected' | 'reconnecting'>('disconnected');
  readonly mediaError = signal<AgoraMediaError | null>(null);

  async join(
    appId: string,
    channel: string,
    token: string,
    uid: number,
    expectedRemoteUIDs: number[] = [1, 2],
  ): Promise<void> {
    await this.leave();
    const AgoraRTC = await this.loadAgora();
    const client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
    this.client = client;
    this.expectedRemoteUIDs = new Set(expectedRemoteUIDs.filter((candidate) => candidate !== uid));

    client.on('user-joined', (user) => this.setRemotePresence(user, 'joined'));
    client.on('user-left', (user) => this.setRemotePresence(user, 'left'));
    client.on('user-published', async (user, mediaType) => {
      if (mediaType === 'datachannel' || !this.isExpectedRemote(user.uid)) return;
      await client.subscribe(user, mediaType);
      if (mediaType === 'audio') user.audioTrack?.play();
      this.updateRemote(user, {
        presence: 'joined',
        audioPublished: mediaType === 'audio' ? true : undefined,
        videoPublished: mediaType === 'video' ? true : undefined,
      });
    });
    client.on('user-unpublished', (user, mediaType) => {
      if (mediaType === 'datachannel') return;
      this.updateRemote(user, {
        audioPublished: mediaType === 'audio' ? false : undefined,
        videoPublished: mediaType === 'video' ? false : undefined,
      });
    });
    client.on('user-info-updated', (remoteUID, message) => {
      const remote = client.remoteUsers.find((user) => Number(user.uid) === Number(remoteUID));
      if (!remote) return;
      this.updateRemote(remote, {
        audioPublished:
          message === 'mute-audio' ? false : message === 'unmute-audio' ? true : undefined,
        videoPublished:
          message === 'mute-video' || message === 'disable-local-video'
            ? false
            : message === 'unmute-video' || message === 'enable-local-video'
              ? true
              : undefined,
      });
    });
    client.on('media-reconnect-start', (remoteUID) => {
      const remote = client.remoteUsers.find((user) => Number(user.uid) === Number(remoteUID));
      if (remote) this.setRemotePresence(remote, 'reconnecting');
    });
    client.on('media-reconnect-end', (remoteUID) => {
      const remote = client.remoteUsers.find((user) => Number(user.uid) === Number(remoteUID));
      if (remote) this.setRemotePresence(remote, 'joined');
    });
    client.on('connection-state-change', (state) => {
      if (state === 'CONNECTED') this.connectionState.set('connected');
      else if (state === 'RECONNECTING') this.connectionState.set('reconnecting');
      else if (state === 'DISCONNECTED') this.connectionState.set('disconnected');
    });

    await client.join(appId, channel, token, uid);
    this.localJoined.set(true);
    this.connectionState.set('connected');
  }

  async enableLocalMedia(): Promise<void> {
    this.mediaError.set(null);
    await Promise.all([this.enableAudio(), this.enableVideo()]);
  }

  async enableAudio(): Promise<void> {
    this.mediaError.set(null);
    this.audioEnablePromise ??= this.createAndPublishAudio().finally(() => {
      this.audioEnablePromise = null;
    });
    await this.audioEnablePromise;
  }

  async enableVideo(): Promise<void> {
    this.mediaError.set(null);
    this.videoEnablePromise ??= this.createAndPublishVideo().finally(() => {
      this.videoEnablePromise = null;
    });
    await this.videoEnablePromise;
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
    if (!track) {
      await this.enableAudio();
      return;
    }
    const next = !this.audioEnabled();
    await track.setEnabled(next);
    this.audioEnabled.set(next);
  }

  async toggleVideo(): Promise<void> {
    const track = this.localVideoTrack();
    if (!track) {
      await this.enableVideo();
      return;
    }
    const next = !this.videoEnabled();
    await track.setEnabled(next);
    this.videoEnabled.set(next);
  }

  leave(): Promise<void> {
    if (this.leavePromise) return this.leavePromise;

    const client = this.client;
    const audioTrack = this.localAudioTrack();
    const videoTrack = this.localVideoTrack();
    this.client = null;
    this.localAudioTrack.set(null);
    this.localVideoTrack.set(null);
    this.remoteParticipants.set(new Map());
    this.audioDevices.set([]);
    this.videoDevices.set([]);
    this.selectedAudioDeviceId.set('');
    this.selectedVideoDeviceId.set('');
    this.expectedRemoteUIDs.clear();
    this.audioEnabled.set(false);
    this.videoEnabled.set(false);
    this.localJoined.set(false);
    this.connectionState.set('disconnected');
    this.mediaError.set(null);

    // Release browser capture immediately. Network leave can take longer and
    // must not keep the camera/microphone indicator or stale UI enabled.
    audioTrack?.close();
    videoTrack?.close();

    this.leavePromise = (async () => {
      try {
        await client?.leave();
      } finally {
        this.leavePromise = null;
      }
    })();
    return this.leavePromise;
  }

  private async createAndPublishAudio(): Promise<void> {
    if (this.localAudioTrack()) return;
    const client = this.client;
    if (!client) {
      this.mediaError.set('network');
      return;
    }
    let track: IMicrophoneAudioTrack;
    try {
      const AgoraRTC = await this.loadAgora();
      track = await AgoraRTC.createMicrophoneAudioTrack();
    } catch (error) {
      this.mediaError.set(this.normalizeMediaError(error));
      return;
    }
    if (this.client !== client) {
      track.close();
      return;
    }
    try {
      await client.publish(track);
      if (this.client !== client) {
        track.close();
        return;
      }
      this.localAudioTrack.set(track);
      this.audioEnabled.set(true);
      track.on('track-ended', () => {
        if (this.localAudioTrack() !== track) return;
        this.localAudioTrack.set(null);
        this.audioEnabled.set(false);
      });
      const deviceId = track.getMediaStreamTrack().getSettings().deviceId;
      if (deviceId) this.selectedAudioDeviceId.set(deviceId);
      await this.loadDevices().catch(() => undefined);
    } catch {
      track.close();
      this.mediaError.set('publish_failed');
    }
  }

  private async createAndPublishVideo(): Promise<void> {
    if (this.localVideoTrack()) return;
    const client = this.client;
    if (!client) {
      this.mediaError.set('network');
      return;
    }
    let track: ICameraVideoTrack;
    try {
      const AgoraRTC = await this.loadAgora();
      track = await AgoraRTC.createCameraVideoTrack();
    } catch (error) {
      this.mediaError.set(this.normalizeMediaError(error));
      return;
    }
    if (this.client !== client) {
      track.close();
      return;
    }
    try {
      await client.publish(track);
      if (this.client !== client) {
        track.close();
        return;
      }
      this.localVideoTrack.set(track);
      this.videoEnabled.set(true);
      track.on('track-ended', () => {
        if (this.localVideoTrack() !== track) return;
        this.localVideoTrack.set(null);
        this.videoEnabled.set(false);
      });
      const deviceId = track.getMediaStreamTrack().getSettings().deviceId;
      if (deviceId) this.selectedVideoDeviceId.set(deviceId);
      await this.loadDevices().catch(() => undefined);
    } catch {
      track.close();
      this.mediaError.set('publish_failed');
    }
  }

  private setRemotePresence(
    user: IAgoraRTCRemoteUser,
    presence: RemoteParticipantState['presence'],
  ): void {
    this.updateRemote(user, { presence });
  }

  private updateRemote(
    user: IAgoraRTCRemoteUser,
    patch: Partial<Omit<RemoteParticipantState, 'uid' | 'videoTrack'>>,
  ): void {
    const uid = Number(user.uid);
    if (!this.isExpectedRemote(uid)) return;
    const next = new Map(this.remoteParticipants());
    const current = next.get(uid);
    next.set(uid, {
      uid,
      presence: patch.presence ?? current?.presence ?? 'joined',
      audioPublished: patch.audioPublished ?? current?.audioPublished ?? !!user.audioTrack,
      videoPublished: patch.videoPublished ?? current?.videoPublished ?? !!user.videoTrack,
      videoTrack: user.videoTrack ?? null,
    });
    this.remoteParticipants.set(next);
  }

  private isExpectedRemote(uid: UID): boolean {
    return this.expectedRemoteUIDs.has(Number(uid));
  }

  private normalizeMediaError(error: unknown): AgoraMediaError {
    const text = String(error).toLowerCase();
    if (text.includes('notallowed') || text.includes('permission') || text.includes('denied')) {
      return 'permission_denied';
    }
    if (text.includes('notfound') || text.includes('device_not_found')) return 'device_missing';
    if (text.includes('notreadable') || text.includes('busy')) return 'device_busy';
    if (text.includes('notsupported') || text.includes('unsupported')) return 'unsupported';
    return 'network';
  }

  private async loadAgora(): Promise<typeof import('agora-rtc-sdk-ng/esm')> {
    this.agoraModule ??= await import('agora-rtc-sdk-ng/esm');
    return this.agoraModule;
  }
}
