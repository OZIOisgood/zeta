import { routes } from './app.routes';

describe('app routes', () => {
  it('exposes the capability-only recording view before guarded routes', () => {
    expect(routes[0].path).toBe('recording-view');
    expect(routes[0].canActivate).toBeUndefined();
  });

  it('matches the full-screen coaching call route before the shell wildcard', () => {
    expect(routes[1].path).toBe('sessions/:groupId/:bookingId/call');
  });

  it('exposes the waitlist redeem route ahead of the shell', () => {
    expect(routes[2].path).toBe('welcome');
  });

  it('exposes the authenticated personal preferences route', () => {
    expect(routes[3].children).toEqual(
      expect.arrayContaining([expect.objectContaining({ path: 'preferences/:tab' })]),
    );
  });

  it('protects permission-gated feature routes like the old dashboard', () => {
    const shellRoutes = routes[3].children ?? [];

    expect(shellRoutes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: 'upload-video',
          data: { permission: 'assets:create' },
        }),
        expect.objectContaining({
          path: 'groups',
          data: { permission: 'groups:read' },
        }),
        expect.objectContaining({
          path: 'create-group',
          data: { permission: 'groups:create' },
        }),
        expect.objectContaining({
          path: 'groups/:id/preferences/:tab',
          data: { permission: 'groups:read' },
        }),
        expect.objectContaining({
          path: 'sessions/book',
          data: { permission: 'coaching:book' },
        }),
        expect.objectContaining({
          path: 'sessions/settings',
          data: { permission: 'coaching:availability:manage' },
        }),
        expect.objectContaining({
          path: 'sessions/:tab',
          data: { permission: 'coaching:bookings:read' },
        }),
      ]),
    );
    expect(routes[1]).toEqual(
      expect.objectContaining({
        path: 'sessions/:groupId/:bookingId/call',
        data: { permission: 'coaching:video:connect' },
      }),
    );
  });
});
