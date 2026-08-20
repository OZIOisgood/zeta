import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { EnvService } from './env.service';
import { credentialsInterceptor } from './credentials.interceptor';

describe('credentialsInterceptor', () => {
  let http: HttpClient;
  let controller: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([credentialsInterceptor])),
        provideHttpClientTesting(),
        { provide: EnvService, useValue: { apiUrl: 'https://api.example.test' } },
      ],
    });
    http = TestBed.inject(HttpClient);
    controller = TestBed.inject(HttpTestingController);
  });

  afterEach(() => controller.verify());

  it('refreshes an expired browser session and retries the request once', () => {
    let response: unknown;
    http.get('https://api.example.test/reports/events').subscribe((value) => {
      response = value;
    });

    const initial = controller.expectOne('https://api.example.test/reports/events');
    expect(initial.request.withCredentials).toBe(true);
    initial.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });

    const refresh = controller.expectOne('https://api.example.test/auth/refresh');
    expect(refresh.request.withCredentials).toBe(true);
    refresh.flush(null, { status: 204, statusText: 'No Content' });

    const retry = controller.expectOne('https://api.example.test/reports/events');
    retry.flush({ items: [] });
    expect(response).toEqual({ items: [] });
  });

  it('shares one refresh across concurrent 401 responses', () => {
    http.get('https://api.example.test/one').subscribe();
    http.get('https://api.example.test/two').subscribe();

    controller
      .expectOne('https://api.example.test/one')
      .flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });
    controller
      .expectOne('https://api.example.test/two')
      .flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });

    const refreshes = controller.match('https://api.example.test/auth/refresh');
    expect(refreshes).toHaveLength(1);
    refreshes[0].flush(null, { status: 204, statusText: 'No Content' });

    controller.expectOne('https://api.example.test/one').flush({ ok: true });
    controller.expectOne('https://api.example.test/two').flush({ ok: true });
  });

  it('does not retry when session refresh is rejected', () => {
    let status = 0;
    http.get('https://api.example.test/reports/events').subscribe({
      error: (error: { status: number }) => {
        status = error.status;
      },
    });

    controller
      .expectOne('https://api.example.test/reports/events')
      .flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });
    controller
      .expectOne('https://api.example.test/auth/refresh')
      .flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });

    expect(status).toBe(401);
    controller.expectNone('https://api.example.test/reports/events');
  });

  it('does not start a second refresh when the retried request is still unauthorized', () => {
    let status = 0;
    http.get('https://api.example.test/reports/events').subscribe({
      error: (error: { status: number }) => {
        status = error.status;
      },
    });

    controller
      .expectOne('https://api.example.test/reports/events')
      .flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });
    controller
      .expectOne('https://api.example.test/auth/refresh')
      .flush(null, { status: 204, statusText: 'No Content' });
    controller
      .expectOne('https://api.example.test/reports/events')
      .flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });

    expect(status).toBe(401);
    controller.expectNone('https://api.example.test/auth/refresh');
  });
});
