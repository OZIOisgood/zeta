import type { ILocalVideoTrack } from 'agora-rtc-sdk-ng/esm';
import { TestBed } from '@angular/core/testing';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { ParticipantTileState } from '../../core/calls/coaching-call.types';
import { ParticipantTileComponent } from './participant-tile.component';

function state(
  videoTrack: ILocalVideoTrack,
  overrides: Partial<ParticipantTileState> = {},
): ParticipantTileState {
  return {
    identity: { uid: 2, role: 'expert', display_name: 'Pavlo L.' },
    presence: 'joined',
    audioEnabled: true,
    videoEnabled: true,
    videoTrack,
    ...overrides,
  };
}

async function setup(initialState: ParticipantTileState, compact = false) {
  await TestBed.configureTestingModule({
    imports: [
      ParticipantTileComponent,
      TranslocoTestingModule.forRoot({
        langs: { en: {} },
        translocoConfig: { availableLangs: ['en'], defaultLang: 'en' },
        preloadLangs: true,
      }),
    ],
  }).compileComponents();
  const fixture = TestBed.createComponent(ParticipantTileComponent);
  fixture.componentRef.setInput('state', initialState);
  fixture.componentRef.setInput('compact', compact);
  fixture.detectChanges();
  return fixture;
}

describe('ParticipantTileComponent', () => {
  it('does not restart video when only microphone state changes', async () => {
    const track = { play: vi.fn(), stop: vi.fn() } as unknown as ILocalVideoTrack;
    const fixture = await setup(state(track));

    expect(track.play).toHaveBeenCalledOnce();

    fixture.componentRef.setInput('state', state(track, { audioEnabled: false }));
    fixture.detectChanges();

    expect(track.stop).not.toHaveBeenCalled();
    expect(track.play).toHaveBeenCalledOnce();

    fixture.componentRef.setInput('state', state(track, { videoEnabled: false }));
    fixture.detectChanges();
    expect(track.stop).toHaveBeenCalledOnce();
  });

  it('uses the compact camera-off presentation inside PiP', async () => {
    const track = { play: vi.fn(), stop: vi.fn() } as unknown as ILocalVideoTrack;
    const fixture = await setup(state(track, { videoEnabled: false }), true);
    const avatar = fixture.nativeElement.querySelector('z-avatar') as HTMLElement;

    expect(avatar.classList.contains('size-10')).toBe(true);
    expect(fixture.nativeElement.textContent).not.toContain('sessions.call.cameraOff');
    expect(fixture.nativeElement.textContent).toContain('Pavlo L.');
  });
});
