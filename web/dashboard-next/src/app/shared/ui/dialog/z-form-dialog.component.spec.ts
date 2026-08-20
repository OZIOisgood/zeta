import { TestBed } from '@angular/core/testing';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { NgpDialogRef } from 'ng-primitives/dialog';
import { provideExitAnimationManager } from 'ng-primitives/internal';
import { EMPTY, Subject } from 'rxjs';
import { ZFormDialogComponent } from './z-form-dialog.component';

describe('ZFormDialogComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        ZFormDialogComponent,
        TranslocoTestingModule.forRoot({
          langs: { en: { common: { actions: { save: 'Save', cancel: 'Cancel' } } } },
          translocoConfig: { availableLangs: ['en'], defaultLang: 'en' },
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
      ],
    }).compileComponents();
  });

  it('disables the save action when the form is invalid', () => {
    const fixture = TestBed.createComponent(ZFormDialogComponent);
    fixture.componentRef.setInput('title', 'Session type');
    fixture.componentRef.setInput('confirmDisabled', true);
    fixture.detectChanges();

    const buttons = Array.from<HTMLButtonElement>(fixture.nativeElement.querySelectorAll('button'));
    const saveButton = buttons.find((button) => button.textContent?.trim() === 'Save');

    expect(saveButton?.disabled).toBe(true);
  });
});
