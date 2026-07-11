const mongoose = require('mongoose');
const { MongoMemoryReplSet } = require('mongodb-memory-server');

const { createRankingRepository } = require('../src/repositories/rankingRepository');
const { createProcessedRunRepository } = require('../src/repositories/processedRunRepository');
const { createRankingService } = require('../src/services/rankingService');
const { runInTransaction } = require('../src/config/database');
const { Ranking } = require('../src/models/Ranking');
const { ProcessedRun } = require('../src/models/ProcessedRun');

jest.setTimeout(120000);

describe('ranking-service com transações MongoDB', () => {
  let replSet;
  let rankingRepository;
  let processedRunRepository;
  let service;

  beforeAll(async () => {
    replSet = await MongoMemoryReplSet.create({
      binary: { version: '7.0.14' },
      replSet: { count: 1, storageEngine: 'wiredTiger' }
    });
    await mongoose.connect(replSet.getUri('ranking-test'));
    await Promise.all([Ranking.init(), ProcessedRun.init()]);
  });

  beforeEach(async () => {
    await Promise.all([Ranking.deleteMany({}), ProcessedRun.deleteMany({})]);
    rankingRepository = createRankingRepository();
    processedRunRepository = createProcessedRunRepository();
    service = createRankingService({
      rankingRepository,
      processedRunRepository,
      runInTransaction
    });
  });

  afterAll(async () => {
    await mongoose.disconnect();
    if (replSet) await replSet.stop();
  });

  test('duas entregas concorrentes do mesmo runId incrementam uma única vez', async () => {
    const event = {
      runId: 'run-concurrent-001',
      userId: 'user-001',
      status: 'victory',
      floor: 6
    };

    const results = await Promise.all([
      service.registerRunResult(event),
      service.registerRunResult(event)
    ]);

    expect(results).toHaveLength(2);
    await expect(Ranking.findOne({ userId: 'user-001' }).lean()).resolves.toMatchObject({
      totalRuns: 1,
      victories: 1,
      bestScore: 600
    });
    await expect(ProcessedRun.countDocuments({ runId: event.runId })).resolves.toBe(1);
  });

  test('falha intermediária desfaz também o registro de ProcessedRun', async () => {
    const failingService = createRankingService({
      processedRunRepository,
      rankingRepository: {
        ...rankingRepository,
        async upsertResult() {
          throw new Error('falha simulada depois de registrar ProcessedRun');
        }
      },
      runInTransaction
    });
    const event = {
      runId: 'run-rollback-001',
      userId: 'user-rollback',
      status: 'defeat',
      floor: 3
    };

    await expect(failingService.registerRunResult(event)).rejects.toThrow('falha simulada');
    await expect(ProcessedRun.countDocuments({ runId: event.runId })).resolves.toBe(0);
    await expect(Ranking.countDocuments({ userId: event.userId })).resolves.toBe(0);

    await expect(service.registerRunResult(event)).resolves.toMatchObject({ totalRuns: 1 });
  });
});
