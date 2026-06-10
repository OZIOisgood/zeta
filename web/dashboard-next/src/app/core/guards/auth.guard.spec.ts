import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { SessionStore } from '../../features/session/session.store';
import { authGuard } from './auth.guard';

describe('authGuard', () => {
  it('passes the attempted URL, including query params, to login', () => {
    const session = {
      status: signal('error'),
      login: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [{ provide: SessionStore, useValue: session }],
    });

    const result = TestBed.runInInjectionContext(() =>
      authGuard(
        {} as ActivatedRouteSnapshot,
        { url: '/groups?invite=LP8ABW' } as RouterStateSnapshot,
      ),
    );

    expect(result).toBe(false);
    expect(session.login).toHaveBeenCalledWith('/groups?invite=LP8ABW');
  });
});
