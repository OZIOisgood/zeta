import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  RouterStateSnapshot,
  UrlTree,
  provideRouter,
} from '@angular/router';
import { SessionStore } from '../../features/session/session.store';
import { accessActiveGuard, waitlistedOnlyGuard } from './access-active.guard';

const routeStub = {} as ActivatedRouteSnapshot;
const stateStub = { url: '/videos' } as RouterStateSnapshot;

function configure(sessionStub: unknown) {
  TestBed.configureTestingModule({
    providers: [provideRouter([]), { provide: SessionStore, useValue: sessionStub }],
  });
}

describe('accessActiveGuard', () => {
  it('allows an authenticated active user through', () => {
    configure({
      status: signal('success'),
      user: signal({ access_status: 'active' }),
      login: vi.fn(),
    });

    const result = TestBed.runInInjectionContext(() => accessActiveGuard(routeStub, stateStub));

    expect(result).toBe(true);
  });

  it('redirects a waitlisted user to /welcome', () => {
    configure({
      status: signal('success'),
      user: signal({ access_status: 'waitlisted' }),
      login: vi.fn(),
    });

    const result = TestBed.runInInjectionContext(() => accessActiveGuard(routeStub, stateStub));

    expect(result).toBeInstanceOf(UrlTree);
    expect((result as UrlTree).toString()).toBe('/welcome');
  });

  it('forwards an invite code from the attempted URL to /welcome', () => {
    configure({
      status: signal('success'),
      user: signal({ access_status: 'waitlisted' }),
      login: vi.fn(),
    });

    const result = TestBed.runInInjectionContext(() =>
      accessActiveGuard(routeStub, { url: '/groups?invite=XYZ' } as RouterStateSnapshot),
    );

    expect(result).toBeInstanceOf(UrlTree);
    expect((result as UrlTree).toString()).toBe('/welcome?code=XYZ');
  });
});

describe('waitlistedOnlyGuard', () => {
  it('allows a waitlisted user to stay on /welcome', () => {
    configure({
      status: signal('success'),
      user: signal({ access_status: 'waitlisted' }),
      login: vi.fn(),
    });

    const result = TestBed.runInInjectionContext(() => waitlistedOnlyGuard(routeStub, stateStub));

    expect(result).toBe(true);
  });

  it('redirects an active user away from /welcome to the app root', () => {
    configure({
      status: signal('success'),
      user: signal({ access_status: 'active' }),
      login: vi.fn(),
    });

    const result = TestBed.runInInjectionContext(() => waitlistedOnlyGuard(routeStub, stateStub));

    expect(result).toBeInstanceOf(UrlTree);
    expect((result as UrlTree).toString()).toBe('/');
  });
});
