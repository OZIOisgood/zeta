import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  RouterStateSnapshot,
  UrlTree,
  provideRouter,
} from '@angular/router';
import { SessionStore } from '../../features/session/session.store';
import { roleGuard } from './role.guard';

type SessionStub = {
  status: ReturnType<typeof signal<string>>;
  user: ReturnType<typeof signal<{ role: string } | null>>;
};

function run(session: SessionStub): boolean | UrlTree {
  TestBed.configureTestingModule({
    providers: [provideRouter([]), { provide: SessionStore, useValue: session }],
  });

  return TestBed.runInInjectionContext(
    () =>
      roleGuard(
        { data: { roles: ['expert', 'admin'] } } as unknown as ActivatedRouteSnapshot,
        { url: '/invite-codes' } as RouterStateSnapshot,
      ) as boolean | UrlTree,
  );
}

describe('roleGuard', () => {
  it('allows an expert', () => {
    const result = run({
      status: signal('success'),
      user: signal({ role: 'expert' }),
    });

    expect(result).toBe(true);
  });

  it('allows an admin', () => {
    const result = run({
      status: signal('success'),
      user: signal({ role: 'admin' }),
    });

    expect(result).toBe(true);
  });

  it('redirects a student to the root', () => {
    const result = run({
      status: signal('success'),
      user: signal({ role: 'student' }),
    });

    expect(result).toBeInstanceOf(UrlTree);
    expect(result.toString()).toBe('/');
  });

  it('redirects an unauthenticated user to the root', () => {
    const result = run({
      status: signal('error'),
      user: signal(null),
    });

    expect(result).toBeInstanceOf(UrlTree);
    expect(result.toString()).toBe('/');
  });
});
