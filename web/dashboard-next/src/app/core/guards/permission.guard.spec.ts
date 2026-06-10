import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, RouterStateSnapshot, provideRouter } from '@angular/router';
import { SessionStore } from '../../features/session/session.store';
import { PermissionsService } from '../permissions/permissions.service';
import { permissionGuard } from './permission.guard';

describe('permissionGuard', () => {
  it('passes the attempted URL, including query params, to login', () => {
    const session = {
      status: signal('error'),
      login: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: SessionStore, useValue: session },
        { provide: PermissionsService, useValue: { hasPermission: vi.fn(() => false) } },
      ],
    });

    const result = TestBed.runInInjectionContext(() =>
      permissionGuard(
        { data: { permission: 'groups:read' } } as unknown as ActivatedRouteSnapshot,
        { url: '/groups?invite=LP8ABW' } as RouterStateSnapshot,
      ),
    );

    expect(result).toBe(false);
    expect(session.login).toHaveBeenCalledWith('/groups?invite=LP8ABW');
  });
});
