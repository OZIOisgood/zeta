import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  ActivatedRoute,
  Router,
  convertToParamMap,
  ParamMap,
  provideRouter,
} from '@angular/router';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { RedeemResponse } from '../../core/http/access-api.service';
import { AsyncSlice } from '../../core/state/async-state';
import { AccessStore } from '../../features/access/access.store';
import { SessionStore } from '../../features/session/session.store';
import { WelcomePageComponent } from './welcome-page.component';

const studentResult: RedeemResponse = {
  access_status: 'active',
  role: 'student',
  role_upgraded: false,
  group: { id: 'group-1', name: 'Morning training' },
};

type AccessStub = ReturnType<typeof createAccessStub>;
let access: AccessStub;
let session: {
  user: ReturnType<typeof signal>;
  loadCurrentUser: ReturnType<typeof vi.fn>;
  logout: ReturnType<typeof vi.fn>;
};

function createAccessStub() {
  const redeemStatus = signal<'idle' | 'loading' | 'error' | 'success'>('idle');
  const result = signal<RedeemResponse | null>(null);
  return {
    redeemStatus,
    previewSlice: signal<AsyncSlice>({ status: 'idle', error: null }),
    preview: signal<{
      code: string;
      group: { id: string; name: string };
      already_member: boolean;
    } | null>(null),
    isSubmitting: () => redeemStatus() === 'loading',
    isActivated: () => redeemStatus() === 'success',
    role: () => result()?.role ?? '',
    joinedGroup: () => result()?.group ?? null,
    resetRedeem: vi.fn(() => {
      redeemStatus.set('idle');
      result.set(null);
    }),
    resetError: vi.fn(() => {
      if (redeemStatus() === 'error') redeemStatus.set('idle');
    }),
    previewGroupInvitation: vi.fn(async () => null),
    redeem: vi.fn(async () => {
      result.set(studentResult);
      redeemStatus.set('success');
      return studentResult;
    }),
  };
}

function routeStub(queryParams: Record<string, string> = {}): {
  snapshot: { queryParamMap: ParamMap };
} {
  return { snapshot: { queryParamMap: convertToParamMap(queryParams) } };
}

async function setup(
  queryParams: Record<string, string> = {},
): Promise<ComponentFixture<WelcomePageComponent>> {
  access = createAccessStub();
  session = {
    user: signal({ language: 'en' }),
    loadCurrentUser: vi.fn(async () => undefined),
    logout: vi.fn(),
  };
  await TestBed.configureTestingModule({
    imports: [
      WelcomePageComponent,
      TranslocoTestingModule.forRoot({
        langs: { en: {} },
        translocoConfig: { availableLangs: ['en'], defaultLang: 'en' },
        preloadLangs: true,
      }),
    ],
    providers: [provideRouter([]), { provide: ActivatedRoute, useValue: routeStub(queryParams) }],
  })
    .overrideComponent(WelcomePageComponent, {
      set: {
        providers: [
          { provide: AccessStore, useValue: access },
          { provide: SessionStore, useValue: session },
        ],
      },
    })
    .compileComponents();
  const fixture = TestBed.createComponent(WelcomePageComponent);
  fixture.detectChanges();
  return fixture;
}

describe('WelcomePageComponent', () => {
  it('renders the waitlist state before code entry', async () => {
    const fixture = await setup();
    expect(fixture.nativeElement.textContent).toContain('access.welcome.waitlistTitle');
    expect(fixture.nativeElement.querySelector('z-otp-input')).toBeNull();
  });

  it('reveals manual code entry', async () => {
    const fixture = await setup();
    fixture.componentInstance['showCode'].set(true);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('z-otp-input')).not.toBeNull();
  });

  it('enables account activation only for a complete alphanumeric code', async () => {
    const fixture = await setup();
    fixture.componentInstance['showCode'].set(true);
    fixture.detectChanges();

    const activateButton = (): HTMLButtonElement =>
      fixture.nativeElement.querySelector('z-button button') as HTMLButtonElement;
    expect(activateButton().disabled).toBe(true);

    fixture.componentInstance['codeControl'].setValue('ABCDEFGH');
    fixture.detectChanges();
    expect(activateButton().disabled).toBe(false);
  });

  it('keeps the success screen until the user continues', async () => {
    const fixture = await setup();
    fixture.componentInstance['showCode'].set(true);
    fixture.componentInstance['codeControl'].setValue('ABC12345');
    await fixture.componentInstance['redeem']();
    fixture.detectChanges();
    expect(access.redeem).toHaveBeenCalledWith('ABC12345');
    expect(fixture.nativeElement.textContent).toContain('access.welcome.successTitle');
    expect(session.loadCurrentUser).not.toHaveBeenCalled();
  });

  it('continues a joined student directly to the group', async () => {
    const fixture = await setup();
    const router = TestBed.inject(Router);
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    fixture.componentInstance['showCode'].set(true);
    fixture.componentInstance['codeControl'].setValue('ABC12345');
    await fixture.componentInstance['redeem']();
    await fixture.componentInstance['enterApp']();
    expect(session.loadCurrentUser).toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith(['/groups', 'group-1']);
  });

  it('previews a preserved group invitation after auth redirect', async () => {
    const fixture = await setup({ code: 'abc12345' });
    expect(fixture.componentInstance['hasDeepLink']()).toBe(true);
    expect(fixture.componentInstance['codeControl'].value).toBe('ABC12345');
    expect(access.previewGroupInvitation).toHaveBeenCalledWith('ABC12345');
  });

  it('adds a data URI prefix to a raw base64 group avatar', async () => {
    const fixture = await setup();

    expect(fixture.componentInstance['avatarSrc']('aGVsbG8=')).toBe(
      'data:image/jpeg;base64,aGVsbG8=',
    );
    expect(fixture.componentInstance['avatarSrc']('data:image/png;base64,aGVsbG8=')).toBe(
      'data:image/png;base64,aGVsbG8=',
    );
  });
});
