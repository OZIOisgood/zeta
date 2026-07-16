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
    if (!this.client) throw new Error('network');
    const AgoraRTC = await this.loadAgora();
    this.mediaError.set(null);
    const [audioResult, videoResult] = await Promise.allSettled([
      this.localAudioTrack() ?? AgoraRTC.createMicrophoneAudioTrack(),
      this.localVideoTrack() ?? AgoraRTC.createCameraVideoTrack(),
    ]);

    const audioTrack = audioResult.status === 'fulfilled' ? audioResult.value : null;
    const videoTrack = videoResult.status === 'fulfilled' ? videoResult.value : null;
    if (!audioTrack && !videoTrack) {
      const reason = audioResult.status === 'rejected' ? audioResult.reason : videoResult;
      this.mediaError.set(this.normalizeMediaError(reason));
      return;
    }

    if (audioTrack && !this.localAudioTrack()) {
      try {
        await this.client.publish(audioTrack);
        this.localAudioTrack.set(audioTrack);
        this.audioEnabled.set(true);
        audioTrack.on('track-ended', () => {
          this.localAudioTrack.set(null);
          this.audioEnabled.set(false);
        });
      } catch {
        audioTrack.close();
        this.mediaError.set('publish_failed');
      }
    }
    if (videoTrack && !this.localVideoTrack()) {
      try {
        await this.client.publish(videoTrack);
        this.localVideoTrack.set(videoTrack);
        this.videoEnabled.set(true);
        videoTrack.on('track-ended', () => {
          this.localVideoTrack.set(null);
          this.videoEnabled.set(false);
        });
      } catch {
        videoTrack.close();
        this.mediaError.set('publish_failed');
      }
    }

    await this.loadDevices().catch(() => undefined);
    const audioDeviceId = this.localAudioTrack()?.getMediaStreamTrack().getSettings().deviceId;
    const videoDeviceId = this.localVideoTrack()?.getMediaStreamTrack().getSettings().deviceId;
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
    this.remoteParticipants.set(new Map());
    this.audioDevices.set([]);
    this.videoDevices.set([]);
    this.selectedAudioDeviceId.set('');
    this.selectedVideoDeviceId.set('');
    this.audioEnabled.set(false);
    this.videoEnabled.set(false);
    this.localJoined.set(false);
    this.connectionState.set('disconnected');
    this.mediaError.set(null);
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
