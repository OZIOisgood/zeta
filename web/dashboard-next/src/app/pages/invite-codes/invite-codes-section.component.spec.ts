import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { SignupCode } from '../../core/http/access-api.service';
import { AppShellStore } from '../../core/state/app-shell.store';
import { AsyncSlice } from '../../core/state/async-state';
import { AccessStore } from '../../features/access/access.store';
import { SessionStore } from '../../features/session/session.store';
import { InviteCodesSectionComponent } from './invite-codes-section.component';

type AccessStub = {
  codes: ReturnType<typeof signal<SignupCode[]>>;
  codesSlice: ReturnType<typeof signal<AsyncSlice>>;
  loadCodes: ReturnType<typeof vi.fn>;
  generateCodes: ReturnType<typeof vi.fn>;
};
type SessionStub = {
  user: ReturnType<typeof signal<{ role: string } | null>>;
};
type ShellStub = {
  showToast: ReturnType<typeof vi.fn>;
};

let access: AccessStub;
let session: SessionStub;
let shell: ShellStub;

async function setup(role: string): Promise<ComponentFixture<InviteCodesSectionComponent>> {
  access = {
    codes: signal<SignupCode[]>([
      { code: 'ALPHA1', status: 'available' },
      { code: 'BETA22', status: 'consumed' },
    ]),
    codesSlice: signal<AsyncSlice>({ status: 'success', error: null }),
    loadCodes: vi.fn(async () => undefined),
    generateCodes: vi.fn(async () => false),
  };
  session = {
    user: signal<{ role: string } | null>({ role }),
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
          { provide: SessionStore, useValue: session },
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
    await setup('expert');

    expect(access.loadCodes).toHaveBeenCalled();
  });

  it('renders one row per code', async () => {
    const fixture = await setup('expert');

    const rows = fixture.nativeElement.querySelectorAll('li');
    expect(rows.length).toBe(2);
    expect(fixture.nativeElement.textContent).toContain('ALPHA1');
    expect(fixture.nativeElement.textContent).toContain('BETA22');
  });

  it('hides the generate button for non-admins', async () => {
    const fixture = await setup('expert');

    expect(fixture.nativeElement.textContent).not.toContain('access.codes.generate');
  });

  it('shows the generate button for admins', async () => {
    const fixture = await setup('admin');

    expect(fixture.nativeElement.textContent).toContain('access.codes.generate');
  });

  it('toasts when generation fails', async () => {
    const fixture = await setup('admin');

    await fixture.componentInstance['generate']();

    expect(access.generateCodes).toHaveBeenCalledWith(5);
    expect(shell.showToast).toHaveBeenCalledWith(
      'access.codes.generateErrorTitle',
      'access.codes.generateError',
      'error',
    );
  });

  it('renders the empty state when there are no codes and the slice succeeded', async () => {
    const fixture = await setup('expert');

    access.codes.set([]);
    access.codesSlice.set({ status: 'success', error: null });
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('z-empty-state')).not.toBeNull();
    expect(fixture.nativeElement.textContent).toContain('access.codes.empty');
  });

  it('renders the error notice when the slice failed', async () => {
    const fixture = await setup('expert');

    access.codesSlice.set({ status: 'error', error: 'boom' });
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('z-empty-state')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('access.codes.loadError');
  });

  it('copies the code, toasts success, and toggles the button label', async () => {
    const writeText = vi.fn(async () => undefined);
    Object.assign(navigator, { clipboard: { writeText } });

    const fixture = await setup('expert');

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
