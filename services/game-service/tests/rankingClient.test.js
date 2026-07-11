const { createRankingClient } = require('../src/services/rankingClient');

describe('rankingClient', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  function client() {
    return createRankingClient({
      baseUrl: 'http://ranking-service:3004',
      internalServiceSecret: 'segredo',
      timeoutMs: 100
    });
  }

  test.each([
    [408, true],
    [429, true],
    [500, true],
    [400, false],
    [409, false]
  ])('classifica HTTP %i com retryable=%s', async (status, retryable) => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status });

    await expect(client().registerRunResult({
      runId: 'run-001', userId: 'user-001', status: 'defeat', floor: 1
    })).rejects.toMatchObject({ statusCode: status, retryable });
  });

  test('falha de rede é retentável', async () => {
    global.fetch = jest.fn().mockRejectedValue(new TypeError('network failed'));

    await expect(client().registerRunResult({
      runId: 'run-001', userId: 'user-001', status: 'defeat', floor: 1
    })).rejects.toMatchObject({ retryable: true });
  });

  test('resposta 2xx conclui a publicação', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue({ data: { totalRuns: 1 } })
    });

    await expect(client().registerRunResult({
      runId: 'run-001', userId: 'user-001', status: 'defeat', floor: 1
    })).resolves.toEqual({ data: { totalRuns: 1 } });
  });
});
