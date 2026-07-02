import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { SignupCode } from '../../core/http/access-api.service';
import { AppShellStore } from '../../core/state/app-shell.store';
import { AsyncSlice } from '../../core/state/async-state';
import { AccessStore } from '../../features/access/access.store';
import { InviteCodesSectionComponent } from './invite-codes-section.component';

type AccessStub = {
  codes: ReturnType<typeof signal<SignupCode[]>>;
  codesSlice: ReturnType<typeof signal<AsyncSlice>>;
  loadCodes: ReturnType<typeof vi.fn>;
  successfulReferrals: ReturnType<typeof signal<number>>;
  referralLimit: ReturnType<typeof signal<number>>;
  remainingReferrals: ReturnType<typeof signal<number>>;
};
type ShellStub = {
  showToast: ReturnType<typeof vi.fn>;
};

let access: AccessStub;
let shell: ShellStub;

async function setup(): Promise<ComponentFixture<InviteCodesSectionComponent>> {
  access = {
    codes: signal<SignupCode[]>([
      { id: '1', code: 'ALPHA1', status: 'available' },
      { id: '2', code: 'BETA22', status: 'consumed', consumed_at: '2026-06-02T00:00:00Z' },
    ]),
    codesSlice: signal<AsyncSlice>({ status: 'success', error: null }),
    loadCodes: vi.fn(async () => undefined),
    successfulReferrals: signal(1),
    referralLimit: signal(5),
    remainingReferrals: signal(4),
  };
  shell = {
    showToast: vi.fn(),
  };

  await TestBed.configureTestingModule({
    imports: [
      InviteCodesSectionComponent,
      TranslocoTestingModule.forRoot({
        langs: { en: {} },
        translocoConfig: { availableLangs: ['en'], defaultLang: 'en' },
        preloadLangs: true,
      }),
    ],
    providers: [provideRouter([])],
  })
    .overrideComponent(InviteCodesSectionComponent, {
      set: {
        providers: [
          { provide: AccessStore, useValue: access },
          { provide: AppShellStore, useValue: shell },
        ],
      },
    })
    .compileComponents();

  const fixture = TestBed.createComponent(InviteCodesSectionComponent);
  fixture.detectChanges();
  return fixture;
}

describe('InviteCodesSectionComponent', () => {
  it('loads the codes on init', async () => {
    await setup();

    expect(access.loadCodes).toHaveBeenCalled();
  });

  it('renders one row per code', async () => {
    const fixture = await setup();

    const rows = fixture.nativeElement.querySelectorAll('li');
    expect(rows.length).toBe(2);
    expect(fixture.nativeElement.textContent).toContain('ALPHA1');
    expect(fixture.nativeElement.textContent).toContain('BETA22');
  });

  it('renders the empty state when there are no codes and the slice succeeded', async () => {
    const fixture = await setup();

    access.codes.set([]);
    access.codesSlice.set({ status: 'success', error: null });
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('z-empty-state')).not.toBeNull();
    expect(fixture.nativeElement.textContent).toContain('access.codes.empty');
  });

  it('renders the error notice when the slice failed', async () => {
    const fixture = await setup();

    access.codesSlice.set({ status: 'error', error: 'boom' });
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('z-empty-state')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('access.codes.loadError');
  });

  it('copies the code, toasts success, and toggles the button label', async () => {
    const writeText = vi.fn(async () => undefined);
    Object.assign(navigator, { clipboard: { writeText } });

    const fixture = await setup();

    await fixture.componentInstance['copy']('ALPHA1');
    fixture.detectChanges();

    expect(writeText).toHaveBeenCalledWith('ALPHA1');
    expect(shell.showToast).toHaveBeenCalledWith(
      'toast.successTitle',
      'access.codes.copied',
      'success',
    );
    expect(fixture.componentInstance['copiedCode']()).toBe('ALPHA1');
    expect(fixture.nativeElement.textContent).toContain('common.actions.copied');
  });
});
