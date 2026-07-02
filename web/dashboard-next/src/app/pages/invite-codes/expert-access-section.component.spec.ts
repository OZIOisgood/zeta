import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { AppShellStore } from '../../core/state/app-shell.store';
import { AccessStore } from '../../features/access/access.store';
import { SessionStore } from '../../features/session/session.store';
import { ExpertAccessSectionComponent } from './expert-access-section.component';

describe('ExpertAccessSectionComponent', () => {
  it('redeems a recommendation code, refreshes the session, and opens expert invitations', async () => {
    const redeemStatus = signal<'idle' | 'loading' | 'error' | 'success'>('idle');
    const access = {
      redeemStatus,
      isSubmitting: () => redeemStatus() === 'loading',
      redeem: vi.fn(async () => ({
        access_status: 'active',
        role: 'expert',
        role_upgraded: true,
      })),
      resetRedeem: vi.fn(),
      resetError: vi.fn(),
    };
    const session = { loadCurrentUser: vi.fn(async () => undefined) };
    const navigate = vi.fn(async () => true);
    const shell = { showToast: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [
        ExpertAccessSectionComponent,
        TranslocoTestingModule.forRoot({
          langs: {
            en: {
              access: {
                welcome: { codeHint: "Codes are 8 characters — letter case doesn't matter." },
                expertAccess: {
                  title: 'Become an expert',
                  description: 'Enter a recommendation code.',
                  codeLabel: 'Expert recommendation code',
                  activate: 'Activate expert access',
                  upgrading: 'Activating...',
                  invalidCode: 'Invalid code',
                  success: 'Your account now has expert access.',
                },
              },
              toast: { successTitle: 'Success' },
            },
          },
          translocoConfig: { availableLangs: ['en'], defaultLang: 'en' },
          preloadLangs: true,
        }),
      ],
      providers: [
        { provide: AccessStore, useValue: access },
        { provide: SessionStore, useValue: session },
        { provide: Router, useValue: { navigate } },
        { provide: AppShellStore, useValue: shell },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(ExpertAccessSectionComponent);
    fixture.detectChanges();
    fixture.componentInstance['codeControl'].setValue('EXPERT01');
    await fixture.componentInstance['redeem']();

    expect(access.redeem).toHaveBeenCalledWith('EXPERT01');
    expect(session.loadCurrentUser).toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith(['/preferences', 'invite-codes']);
    expect(shell.showToast).toHaveBeenCalledWith(
      'Success',
      'Your account now has expert access.',
      'success',
    );
  });
});
