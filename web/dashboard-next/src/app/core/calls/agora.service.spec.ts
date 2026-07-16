import type {
  IAgoraRTCClient,
  ICameraVideoTrack,
  IMicrophoneAudioTrack,
} from 'agora-rtc-sdk-ng/esm';
import { AgoraService } from './agora.service';

describe('AgoraService', () => {
  it('closes devices and clears call state before network leave resolves', async () => {
    const service = new AgoraService();
    let resolveLeave!: () => void;
    const client = {
      leave: vi.fn(
        () =>
          new Promise<void>((resolve) => {
            resolveLeave = resolve;
          }),
      ),
    } as unknown as IAgoraRTCClient;
    const audioTrack = { close: vi.fn() } as unknown as IMicrophoneAudioTrack;
    const videoTrack = { close: vi.fn() } as unknown as ICameraVideoTrack;

    (service as unknown as { client: IAgoraRTCClient | null }).client = client;
    service.localAudioTrack.set(audioTrack);
    service.localVideoTrack.set(videoTrack);
    service.audioEnabled.set(true);
    service.videoEnabled.set(true);
    service.localJoined.set(true);
    service.connectionState.set('connected');

    const firstLeave = service.leave();
    const secondLeave = service.leave();

    expect(audioTrack.close).toHaveBeenCalledOnce();
    expect(videoTrack.close).toHaveBeenCalledOnce();
    expect(client.leave).toHaveBeenCalledOnce();
    expect(service.localAudioTrack()).toBeNull();
    expect(service.localVideoTrack()).toBeNull();
    expect(service.audioEnabled()).toBe(false);
    expect(service.videoEnabled()).toBe(false);
    expect(service.localJoined()).toBe(false);
    expect(service.connectionState()).toBe('disconnected');

    resolveLeave();
    await Promise.all([firstLeave, secondLeave]);
  });

  it('uses a muted control press to retry a missing device', async () => {
    const service = new AgoraService();
    const enableAudio = vi.spyOn(service, 'enableAudio').mockResolvedValue();
    const enableVideo = vi.spyOn(service, 'enableVideo').mockResolvedValue();

    await service.toggleAudio();
    await service.toggleVideo();

    expect(enableAudio).toHaveBeenCalledOnce();
    expect(enableVideo).toHaveBeenCalledOnce();
  });
});
