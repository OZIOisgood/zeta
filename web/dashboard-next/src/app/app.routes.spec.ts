import { routes } from './app.routes';

describe('app routes', () => {
  it('matches the full-screen coaching call route before the shell wildcard', () => {
    expect(routes[0].path).toBe('sessions/:groupId/:bookingId/call');
  });

  it('exposes the authenticated personal preferences route', () => {
    expect(routes[1].children).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: 'preferences/:tab' }),
      ]),
    );
  });
});
