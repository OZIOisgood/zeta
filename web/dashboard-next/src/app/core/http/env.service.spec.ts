import { EnvService } from './env.service';

type RuntimeEnvWindow = Window & {
  __env?: {
    apiUrl?: string;
    minSessionDurationMinutes?: number | string;
    sessionDurationStepMinutes?: number | string;
  };
};

describe('EnvService', () => {
  const runtimeWindow = window as RuntimeEnvWindow;

  afterEach(() => {
    delete runtimeWindow.__env;
  });

  it('reads the session duration contract from runtime configuration', () => {
    runtimeWindow.__env = {
      apiUrl: 'https://api.example.test',
      minSessionDurationMinutes: '1',
      sessionDurationStepMinutes: 1,
    };

    const env = new EnvService();

    expect(env.apiUrl).toBe('https://api.example.test');
    expect(env.minSessionDurationMinutes).toBe(1);
    expect(env.sessionDurationStepMinutes).toBe(1);
  });

  it('falls back to the production-safe contract for invalid runtime values', () => {
    runtimeWindow.__env = {
      minSessionDurationMinutes: 'not-a-number',
      sessionDurationStepMinutes: 0,
    };

    const env = new EnvService();

    expect(env.minSessionDurationMinutes).toBe(15);
    expect(env.sessionDurationStepMinutes).toBe(5);
  });
});
