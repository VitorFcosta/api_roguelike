const {
  createOutboxProcessor,
  calculateBackoffMs,
  sanitizeError
} = require('../src/services/outboxProcessor');

function makeMetrics() {
  return {
    published: { inc: jest.fn() },
    failures: { inc: jest.fn() },
    deadLetters: { inc: jest.fn() },
    pending: { set: jest.fn() },
    processingDuration: { startTimer: jest.fn(() => jest.fn()) }
  };
}

function makeProcessor({ event, clientError } = {}) {
  const outboxRepository = {
    claimNext: jest.fn()
      .mockResolvedValueOnce(event || null)
      .mockResolvedValueOnce(null),
    markPublished: jest.fn(),
    scheduleRetry: jest.fn(),
    markDeadLetter: jest.fn(),
    countPending: jest.fn().mockResolvedValue(0)
  };
  const rankingClient = {
    registerRunResult: clientError
      ? jest.fn().mockRejectedValue(clientError)
      : jest.fn().mockResolvedValue({})
  };
  const metrics = makeMetrics();
  const processor = createOutboxProcessor({
    outboxRepository,
    rankingClient,
    metrics,
    workerId: 'worker-test',
    batchSize: 20,
    maxAttempts: 10,
    baseDelayMs: 1000,
    maxDelayMs: 60000,
    lockTimeoutMs: 30000,
    now: () => new Date('2026-01-01T00:00:00.000Z')
  });

  return { processor, outboxRepository, rankingClient, metrics };
}

const EVENT = {
  _id: 'event-001',
  attempts: 1,
  payload: { runId: 'run-001', userId: 'user-001', status: 'defeat', floor: 2 }
};

describe('outboxProcessor', () => {
  test('publica e marca o evento como published', async () => {
    const { processor, outboxRepository, metrics } = makeProcessor({ event: EVENT });

    await expect(processor.processCycle()).resolves.toBe(1);

    expect(outboxRepository.markPublished).toHaveBeenCalledWith(
      EVENT._id,
      'worker-test',
      new Date('2026-01-01T00:00:00.000Z')
    );
    expect(metrics.published.inc).toHaveBeenCalledTimes(1);
  });

  test('agenda nova tentativa com backoff exponencial para falha retentável', async () => {
    const error = Object.assign(new Error('ranking indisponível'), { retryable: true });
    const event = { ...EVENT, attempts: 3 };
    const { processor, outboxRepository } = makeProcessor({ event, clientError: error });

    await processor.processCycle();

    expect(outboxRepository.scheduleRetry).toHaveBeenCalledWith(
      event._id,
      'worker-test',
      expect.objectContaining({
        nextAttemptAt: new Date('2026-01-01T00:00:04.000Z'),
        lastError: 'ranking indisponível'
      })
    );
  });

  test('envia para dead-letter na décima falha', async () => {
    const error = Object.assign(new Error('timeout'), { retryable: true });
    const event = { ...EVENT, attempts: 10 };
    const { processor, outboxRepository, metrics } = makeProcessor({ event, clientError: error });

    await processor.processCycle();

    expect(outboxRepository.markDeadLetter).toHaveBeenCalledWith(
      event._id,
      'worker-test',
      'timeout'
    );
    expect(metrics.deadLetters.inc).toHaveBeenCalledTimes(1);
  });

  test('erro permanente vai diretamente para dead-letter', async () => {
    const error = Object.assign(new Error('HTTP 400'), { retryable: false });
    const { processor, outboxRepository } = makeProcessor({ event: EVENT, clientError: error });

    await processor.processCycle();

    expect(outboxRepository.markDeadLetter).toHaveBeenCalled();
    expect(outboxRepository.scheduleRetry).not.toHaveBeenCalled();
  });

  test('limita e sanitiza lastError', () => {
    expect(sanitizeError(new Error(`erro\n${'x'.repeat(600)}`))).toHaveLength(500);
    expect(calculateBackoffMs(7, 1000, 60000)).toBe(60000);
  });
});
