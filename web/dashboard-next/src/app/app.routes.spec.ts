import { routes } from './app.routes';

describe('app routes', () => {
  it('matches the full-screen coaching call route before the shell wildcard', () => {
    expect(routes[0].path).toBe('sessions/:groupId/:bookingId/call');
  });
});
