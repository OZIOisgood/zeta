import { TestBed } from '@angular/core/testing';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { NgpDialogRef } from 'ng-primitives/dialog';
import { provideExitAnimationManager } from 'ng-primitives/internal';
import { EMPTY, Subject, of } from 'rxjs';
import { GroupsApiClient } from '../../core/http/groups-api.service';
import { AppShellStore } from '../../core/state/app-shell.store';
import { GroupInvitationDialogComponent } from './group-invitation-dialog.component';

describe('GroupInvitationDialogComponent', () => {
  let createObjectUrl: ReturnType<typeof vi.spyOn>;
  let revokeObjectUrl: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    createObjectUrl = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:qr-code');
    revokeObjectUrl = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);

    await TestBed.configureTestingModule({
      imports: [
        GroupInvitationDialogComponent,
        TranslocoTestingModule.forRoot({
          langs: {
            en: {
              common: {
                actions: {
                  cancel: 'Cancel',
                  copied: 'Copied!',
                  copyLink: 'Copy Link',
                  createInvitation: 'Create Invitation',
                  done: 'Done',
                  downloadQr: 'Download QR',
                },
                fields: { emailAddressOptional: 'Email Address (optional)' },
              },
              groups: {
                inviteDialog: {
                  creating: 'Creating invitation...',
                  description: 'Create a reusable invite link and QR code.',
                  emailHint: 'Leave the email empty to create a generic link.',
                  emailInvalid: 'Please enter a valid email address.',
                  failed: 'Failed to create invitation.',
                  linkCreated: 'Invitation link created!',
                  qrAlt: 'Invitation QR Code',
                  qrUnavailable: 'QR unavailable',
                  sent: 'Invitation sent successfully!',
                  shareHint: 'Students can use this link.',
                  shareLink: 'Share link',
                  title: 'Create invitation',
                },
              },
              toast: { successTitle: 'Success' },
            },
          },
          translocoConfig: {
            availableLangs: ['en'],
            defaultLang: 'en',
          },
          preloadLangs: true,
        }),
      ],
      providers: [
        provideExitAnimationManager(),
        {
          provide: NgpDialogRef,
          useValue: {
            closed: new Subject(),
            close: vi.fn(),
            config: {},
            getElements: () => [],
            id: 'test-dialog',
            keydownEvents: EMPTY,
            outsidePointerEvents: EMPTY,
            outsidePointerEvents$: new Subject(),
          },
        },
        {
          provide: GroupsApiClient,
          useValue: {
            createGroupInvitation: vi.fn(() => of({ id: 'invite-1', code: 'ABC123' })),
            getGroupInvitationQrCode: vi.fn(() => of(new Blob(['qr']))),
          },
        },
        {
          provide: AppShellStore,
          useValue: { showToast: vi.fn() },
        },
      ],
    }).compileComponents();
  });

  afterEach(() => {
    createObjectUrl.mockRestore();
    revokeObjectUrl.mockRestore();
  });

  it('creates an invitation and renders the share link with QR actions', async () => {
    const api = TestBed.inject(GroupsApiClient);
    const shell = TestBed.inject(AppShellStore);
    const submitEvent = { preventDefault: vi.fn() } as unknown as SubmitEvent;
    const fixture = TestBed.createComponent(GroupInvitationDialogComponent);
    fixture.componentRef.setInput('groupId', 'group-1');
    fixture.componentRef.setInput('close', vi.fn());
    fixture.detectChanges();

    (fixture.componentInstance as any).createInvitation(submitEvent);
    await fixture.whenStable();
    fixture.detectChanges();

    expect(submitEvent.preventDefault).toHaveBeenCalled();
    expect(api.createGroupInvitation).toHaveBeenCalledWith('group-1', undefined);
    expect(api.getGroupInvitationQrCode).toHaveBeenCalledWith('group-1', 'invite-1');
    expect(shell.showToast).toHaveBeenCalledWith(
      'Success',
      'Invitation link created!',
    );
    expect(fixture.nativeElement.textContent).toContain('/groups?invite=ABC123');
    expect(fixture.nativeElement.textContent).toContain('Download QR');
  });

  it('shows validation feedback for dirty invalid email', () => {
    const api = TestBed.inject(GroupsApiClient);
    const fixture = TestBed.createComponent(GroupInvitationDialogComponent);
    fixture.componentRef.setInput('groupId', 'group-1');
    fixture.componentRef.setInput('close', vi.fn());
    fixture.detectChanges();

    const emailControl = (fixture.componentInstance as any).emailControl;
    emailControl.setValue('not-an-email');
    emailControl.markAsDirty();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Please enter a valid email address.');
    expect(api.createGroupInvitation).not.toHaveBeenCalled();
  });
});
