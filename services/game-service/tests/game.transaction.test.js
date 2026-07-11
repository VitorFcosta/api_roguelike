const mongoose = require('mongoose');
const { MongoMemoryReplSet } = require('mongodb-memory-server');

const { createGameService } = require('../src/services/gameService');
const { createRunRepository } = require('../src/repositories/runRepository');
const { createBattleRepository } = require('../src/repositories/battleRepository');
const { createRewardRepository } = require('../src/repositories/rewardRepository');
const { createOutboxRepository } = require('../src/repositories/outboxRepository');
const { runInTransaction } = require('../src/config/database');
const { Run } = require('../src/models/Run');
const { Battle } = require('../src/models/Battle');
const { Reward } = require('../src/models/Reward');
const { OutboxEvent } = require('../src/models/OutboxEvent');

jest.setTimeout(120000);

const objectId = () => new mongoose.Types.ObjectId();
const STARTER_CARDS = [
  { _id: objectId(), name: 'Ataque', type: 'attack', cost: 1, value: 6, rarity: 'basic' },
  { _id: objectId(), name: 'Defesa', type: 'block', cost: 1, value: 5, rarity: 'basic' },
  { _id: objectId(), name: 'Cura', type: 'heal', cost: 1, value: 4, rarity: 'basic' }
];
const REWARD_CARDS = [
  { _id: objectId(), name: 'Golpe', type: 'attack', cost: 2, value: 12, rarity: 'rare' },
  { _id: objectId(), name: 'Muralha', type: 'block', cost: 2, value: 10, rarity: 'common' },
  { _id: objectId(), name: 'Cura Maior', type: 'heal', cost: 2, value: 12, rarity: 'rare' }
];
const ENEMY = {
  _id: objectId(), name: 'Slime', maxHp: 10, attack: 3, defense: 0, specialAttack: 0
};

function makeCatalogClient() {
  return {
    getStarterCards: jest.fn().mockResolvedValue(STARTER_CARDS),
    getRandomEnemy: jest.fn().mockResolvedValue(ENEMY),
    getRandomBoss: jest.fn().mockResolvedValue(ENEMY),
    getRewardCards: jest.fn().mockResolvedValue(REWARD_CARDS)
  };
}

describe('game-service com transações MongoDB', () => {
  let replSet;
  let repositories;

  beforeAll(async () => {
    replSet = await MongoMemoryReplSet.create({
      binary: { version: '7.0.14' },
      replSet: { count: 1, storageEngine: 'wiredTiger' }
    });
    await mongoose.connect(replSet.getUri('game-test'));
    await Promise.all([Run.init(), Battle.init(), Reward.init(), OutboxEvent.init()]);
  });

  beforeEach(async () => {
    await Promise.all([
      Run.deleteMany({}),
      Battle.deleteMany({}),
      Reward.deleteMany({}),
      OutboxEvent.deleteMany({})
    ]);
    repositories = {
      runRepository: createRunRepository(),
      battleRepository: createBattleRepository(),
      rewardRepository: createRewardRepository(),
      outboxRepository: createOutboxRepository()
    };
  });

  afterAll(async () => {
    await mongoose.disconnect();
    if (replSet) await replSet.stop();
  });

  function makeService(overrides = {}) {
    return createGameService({
      ...repositories,
      catalogClient: makeCatalogClient(),
      runInTransaction,
      ...overrides
    });
  }

  async function prepareBattle(service, userId = 'user-001') {
    const run = await service.createRun(userId);
    const battle = await service.createBattle(run._id, userId);
    const attackCard = run.deck.find((card) => card.type === 'attack');
    return { run, battle, attackCard };
  }

  test('falha ao criar recompensa desfaz batalha e avanço da run', async () => {
    const failingRewardRepository = {
      ...repositories.rewardRepository,
      async create() {
        throw new Error('falha simulada ao criar recompensa');
      }
    };
    const service = makeService({ rewardRepository: failingRewardRepository });
    const { run, battle, attackCard } = await prepareBattle(service);

    await service.playCard(battle._id, attackCard.cardId, 'user-001');
    await expect(service.playCard(battle._id, attackCard.cardId, 'user-001'))
      .rejects.toThrow('falha simulada');

    await expect(Battle.findById(battle._id).lean()).resolves.toMatchObject({
      status: 'active',
      turn: 2,
      enemyCurrentHp: 4
    });
    await expect(Run.findById(run._id).lean()).resolves.toMatchObject({ floor: 1 });
    await expect(Reward.countDocuments({ runId: run._id })).resolves.toBe(0);
  });

  test('falha ao adicionar carta desfaz o consumo da recompensa', async () => {
    const service = makeService();
    const { run, battle, attackCard } = await prepareBattle(service);
    await service.playCard(battle._id, attackCard.cardId, 'user-001');
    await service.playCard(battle._id, attackCard.cardId, 'user-001');
    const reward = await service.getRewards(run._id, 'user-001');

    const failingRunRepository = {
      ...repositories.runRepository,
      async addCardToDeck() {
        throw new Error('falha simulada ao atualizar deck');
      }
    };
    const failingService = makeService({ runRepository: failingRunRepository });

    await expect(failingService.chooseReward(
      reward._id,
      reward.options[0].cardId,
      'user-001'
    )).rejects.toThrow('falha simulada');

    await expect(Reward.findById(reward._id).lean()).resolves.toMatchObject({ status: 'pending' });
    await expect(Run.findById(run._id).lean()).resolves.toMatchObject({
      deck: expect.any(Array)
    });
    const persistedRun = await Run.findById(run._id).lean();
    expect(persistedRun.deck).toHaveLength(3);
  });

  test('duas ações concorrentes no mesmo turno produzem um commit e um 409', async () => {
    const service = makeService();
    const { battle, attackCard } = await prepareBattle(service);

    const results = await Promise.allSettled([
      service.playCard(battle._id, attackCard.cardId, 'user-001'),
      service.playCard(battle._id, attackCard.cardId, 'user-001')
    ]);

    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(results.find((result) => result.status === 'rejected').reason)
      .toMatchObject({ statusCode: 409, code: 'BATTLE_STATE_CHANGED' });
  });

  test('abandono concorrente finaliza a run e cria exatamente um outbox', async () => {
    const service = makeService();
    const run = await service.createRun('user-001');

    const results = await Promise.allSettled([
      service.abandonRun(run._id, 'user-001'),
      service.abandonRun(run._id, 'user-001')
    ]);

    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    await expect(OutboxEvent.countDocuments({ aggregateId: String(run._id) })).resolves.toBe(1);
  });

  test('claim recupera um lock abandonado depois do timeout', async () => {
    const repository = repositories.outboxRepository;
    const event = await repository.createRunFinished({
      runId: objectId(),
      userId: 'user-lock',
      status: 'abandoned',
      floor: 2
    });
    await OutboxEvent.findByIdAndUpdate(event._id, {
      status: 'processing',
      attempts: 1,
      lockedBy: 'worker-que-caiu',
      lockedAt: new Date('2026-01-01T00:00:00.000Z')
    });

    const claimed = await repository.claimNext({
      now: new Date('2026-01-01T00:00:31.000Z'),
      lockTimeoutMs: 30000,
      workerId: 'worker-recuperacao'
    });

    expect(claimed).toMatchObject({
      status: 'processing',
      attempts: 2,
      lockedBy: 'worker-recuperacao'
    });
  });
});
