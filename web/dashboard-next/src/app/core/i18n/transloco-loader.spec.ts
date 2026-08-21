import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { TranslocoHttpLoader } from './transloco-loader';

describe('TranslocoHttpLoader', () => {
  let loader: TranslocoHttpLoader;
  let controller: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    loader = TestBed.inject(TranslocoHttpLoader);
    controller = TestBed.inject(HttpTestingController);
  });

  afterEach(() => controller.verify());

  it('uses the versioned locale URL so previously cached translations are invalidated', () => {
    loader.getTranslation('en').subscribe();

    controller.expectOne('/i18n/en.json?v=2').flush({ common: {} });
  });
});
