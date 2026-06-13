import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { RedeemResponse } from '../../core/http/access-api.service';
import { AccessStore } from '../../features/access/access.store';
import { SessionStore } from '../../features/session/session.store';
import { WelcomePageComponent } from './welcome-page.component';

const redeemResult: RedeemResponse = {
  access_status: 'active',
  role: 'student',
  role_upgraded: false,
};

type AccessStub = {
  redeemStatus: ReturnType<typeof signal<string>>;
  redeem: ReturnType<typeof vi.fn>;
  resetRedeem: ReturnType<typeof vi.fn>;
};
type SessionStub = {
  loadCurrentUser: ReturnType<typeof vi.fn>;
  logout: ReturnType<typeof vi.fn>;
};

let access: AccessStub;
let session: SessionStub;

async function setup(): Promise<ComponentFixture<WelcomePageComponent>> {
  access = {
    redeemStatus: signal<string>('idle'),
    redeem: vi.fn(async () => redeemResult),
    resetRedeem: vi.fn(),
  };
  session = {
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
    providers: [provideRouter([])],
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

function setCode(fixture: ComponentFixture<WelcomePageComponent>, value: string): void {
  const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
  input.value = value;
  input.dispatchEvent(new Event('input'));
  fixture.detectChanges();
}

describe('WelcomePageComponent', () => {
  it('redeems a trimmed code, reloads the user, and navigates to the root on success', async () => {
    const fixture = await setup();
    const router = TestBed.inject(Router);
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    setCode(fixture, '  ABC123  ');

    const form = fixture.nativeElement.querySelector('form') as HTMLFormElement;
    form.dispatchEvent(new Event('submit'));
    await fixture.whenStable();

    expect(access.redeem).toHaveBeenCalledWith('ABC123');
    expect(session.loadCurrentUser).toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith(['/']);
  });

  it('does not redeem when the code is empty and marks the control touched', async () => {
    const fixture = await setup();
    const router = TestBed.inject(Router);
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    const form = fixture.nativeElement.querySelector('form') as HTMLFormElement;
    form.dispatchEvent(new Event('submit'));
    await fixture.whenStable();

    expect(access.redeem).not.toHaveBeenCalled();
    expect(session.loadCurrentUser).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
    expect(fixture.componentInstance['form'].controls.code.touched).toBe(true);
  });
});
