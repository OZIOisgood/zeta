import { createApiClient } from './client';

test('attaches the base url from the environment', async () => {
  const calls: string[] = [];
  const fetchSpy: typeof fetch = async (input) => {
    calls.push(String(input instanceof Request ? input.url : input));
    return new Response(JSON.stringify({ status: 'ok' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };

  const client = createApiClient({ baseUrl: 'https://api.example.test', fetch: fetchSpy });
  const { data, error } = await client.GET('/health');

  expect(error).toBeUndefined();
  expect(data?.status).toBe('ok');
  expect(calls[0]).toBe('https://api.example.test/health');
});
