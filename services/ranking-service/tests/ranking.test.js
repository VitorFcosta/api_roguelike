const request = require('supertest');

const { createApp } = require('../src/app');

const USER_HEADERS = {
  'X-User-Id': 'user-001',
  'X-User-Role': 'user',
  'X-Internal-Service-Secret': 'test_internal_secret'
};

const INTERNAL_HEADERS = {
  'X-Internal-Service-Secret': 'test_internal_secret'
};

const TEST_CONFIG = {
  internalServiceSecret: 'test_internal_secret'
};

function createMemoryRankingRepository() {
  const rankings = new Map();

  return {
    async upsertResult({ userId, userName, isVictory, score }) {
      const current = rankings.get(userId) || {
        userId,
        userName,
        totalRuns: 0,
        victories: 0,
        defeats: 0,
        bestScore: 0,
        bossKills: 0,
        lastRunAt: null
      };

      current.userName = userName;
      current.totalRuns += 1;
      current.victories += isVictory ? 1 : 0;
      current.defeats += isVictory ? 0 : 1;
      current.bossKills += isVictory ? 1 : 0;
      current.bestScore = Math.max(current.bestScore, score);
      current.lastRunAt = new Date();

      rankings.set(userId, current);
      return current;
    },

    async findByUserId(userId) {
      return rankings.get(userId) || null;
    },

    async findAll({ limit = 50 } = {}) {
      return [...rankings.values()]
        .sort((a, b) => b.bestScore - a.bestScore)
        .slice(0, limit);
    }
  };
}

function createMemoryProcessedRunRepository() {
  const processedRuns = new Map();

  return {
    async findByRunId(runId) {
      return processedRuns.get(runId) || null;
    },

    async create(data) {
      if (processedRuns.has(data.runId)) {
        const error = new Error('duplicate runId');
        error.code = 11000;
        throw error;
      }
      const processedRun = { ...data };
      processedRuns.set(data.runId, processedRun);
      return processedRun;
    }
  };
}

describe('ranking-service', () => {
  let app;

  beforeEach(() => {
    app = createApp({
      rankingRepository: createMemoryRankingRepository(),
      processedRunRepository: createMemoryProcessedRunRepository(),
      runInTransaction: async (work) => work(undefined),
      config: TEST_CONFIG
    });
  });

  test('POST /ranking/events/run-finished registra vitória pela rota interna oficial', async () => {
    const response = await request(app)
      .post('/ranking/events/run-finished')
      .set(INTERNAL_HEADERS)
      .send({
        userId: 'user-001',
        userName: 'Ana Souza',
        runId: 'run-001',
        status: 'victory',
        floor: 6
      });

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({
      userId: 'user-001',
      userName: 'Ana Souza',
      totalRuns: 1,
      victories: 1,
      defeats: 0,
      bestScore: 600,
      bossKills: 1
    });
  });

  test('POST /ranking/events/run-finished sem segredo interno retorna 401', async () => {
    const response = await request(app)
      .post('/ranking/events/run-finished')
      .send({
        userId: 'user-001',
        status: 'victory',
        floor: 6
      });

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('INTERNAL_AUTH_REQUIRED');
  });

  test('POST /ranking/events/run-finished ignora score enviado no body', async () => {
    const response = await request(app)
      .post('/ranking/events/run-finished')
      .set(INTERNAL_HEADERS)
      .send({
        userId: 'user-003',
        userName: 'Score Forjado',
        runId: 'run-score-001',
        status: 'victory',
        floor: 2,
        score: 999999
      });

    expect(response.status).toBe(200);
    expect(response.body.data.bestScore).toBe(200);
  });

  test('POST /rankings continua funcionando como alias temporário', async () => {
    const response = await request(app)
      .post('/rankings')
      .set(INTERNAL_HEADERS)
      .send({
        userId: 'user-002',
        userName: 'Bruno',
        runId: 'run-alias-001',
        status: 'defeat',
        floor: 3
      });

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({
      userId: 'user-002',
      totalRuns: 1,
      victories: 0,
      defeats: 1,
      bestScore: 30
    });
  });

  test('GET /ranking respeita limit e ordena por bestScore', async () => {
    await request(app)
      .post('/ranking/events/run-finished')
      .set(INTERNAL_HEADERS)
      .send({ userId: 'low', userName: 'Low', runId: 'run-low', status: 'defeat', floor: 2 });
    await request(app)
      .post('/ranking/events/run-finished')
      .set(INTERNAL_HEADERS)
      .send({ userId: 'high', userName: 'High', runId: 'run-high', status: 'victory', floor: 6 });

    const response = await request(app)
      .get('/ranking?limit=1')
      .set(USER_HEADERS);

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].userId).toBe('high');
  });

  test('GET /ranking/me retorna zeros quando usuário ainda não tem ranking', async () => {
    const response = await request(app)
      .get('/ranking/me')
      .set(USER_HEADERS);

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({
      userId: 'user-001',
      totalRuns: 0,
      victories: 0,
      defeats: 0,
      bestScore: 0,
      bossKills: 0,
      lastRunAt: null
    });
  });

  test('GET /ranking/me reflete derrota registrada para o usuário', async () => {
    await request(app)
      .post('/ranking/events/run-finished')
      .set(INTERNAL_HEADERS)
      .send({
        userId: 'user-001',
        userName: 'Jogador Derrotado',
        runId: 'run-defeat-001',
        status: 'defeat',
        floor: 4
      });

    const response = await request(app)
      .get('/ranking/me')
      .set(USER_HEADERS);

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({
      userId: 'user-001',
      userName: 'Jogador Derrotado',
      totalRuns: 1,
      victories: 0,
      defeats: 1,
      bestScore: 40,
      bossKills: 0
    });
  });

  test('repetir o mesmo runId com o mesmo payload não incrementa novamente', async () => {
    const event = {
      userId: 'user-001',
      userName: 'Ana Souza',
      runId: 'run-idempotent-001',
      status: 'victory',
      floor: 6
    };

    await request(app)
      .post('/ranking/events/run-finished')
      .set(INTERNAL_HEADERS)
      .send(event)
      .expect(200);

    const repeated = await request(app)
      .post('/ranking/events/run-finished')
      .set(INTERNAL_HEADERS)
      .send(event)
      .expect(200);

    expect(repeated.body.data).toMatchObject({ totalRuns: 1, victories: 1 });
  });

  test('mesmo runId com payload diferente retorna conflito', async () => {
    await request(app)
      .post('/ranking/events/run-finished')
      .set(INTERNAL_HEADERS)
      .send({ userId: 'user-001', runId: 'run-conflict-001', status: 'defeat', floor: 2 })
      .expect(200);

    const conflict = await request(app)
      .post('/ranking/events/run-finished')
      .set(INTERNAL_HEADERS)
      .send({ userId: 'user-001', runId: 'run-conflict-001', status: 'victory', floor: 2 });

    expect(conflict.status).toBe(409);
    expect(conflict.body.error.code).toBe('RUN_EVENT_CONFLICT');
  });

  test('evento sem runId é rejeitado', async () => {
    const response = await request(app)
      .post('/ranking/events/run-finished')
      .set(INTERNAL_HEADERS)
      .send({ userId: 'user-001', status: 'victory', floor: 6 });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('INVALID_PAYLOAD');
  });
});
