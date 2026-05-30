const request = require('supertest');
const mongoose = require('mongoose');

const { createApp } = require('../src/app');

// ============================================================
// Repositórios em memória — mesma abordagem do auth-service
// ============================================================

function makeId() {
  return new mongoose.Types.ObjectId().toHexString();
}

function createMemoryCardRepository() {
  const cards = [];

  return {
    cards,
    async listActive() {
      return cards.filter((c) => c.isActive);
    },
    async findById(id) {
      return cards.find((c) => c._id === id && c.isActive) || null;
    },
    async findStarters() {
      return cards.filter((c) => c.isStarter && c.isActive);
    },
    async create(data) {
      const card = {
        _id: makeId(),
        isActive: true,
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...data
      };
      cards.push(card);
      return card;
    },
    async update(id, data) {
      const card = cards.find((c) => c._id === id && c.isActive);
      if (!card) return null;
      Object.assign(card, data, { updatedAt: new Date() });
      return card;
    },
    async softDelete(id) {
      const card = cards.find((c) => c._id === id && c.isActive);
      if (!card) return null;
      card.isActive = false;
      card.deletedAt = new Date();
      return card;
    }
  };
}

function createMemoryEnemyRepository() {
  const enemies = [];

  return {
    enemies,
    async listActive() {
      return enemies.filter((e) => e.isActive);
    },
    async findById(id) {
      return enemies.find((e) => e._id === id && e.isActive) || null;
    },
    async findRandom() {
      const active = enemies.filter((e) => e.isActive);
      if (active.length === 0) return null;
      return active[Math.floor(Math.random() * active.length)];
    },
    async create(data) {
      const enemy = {
        _id: makeId(),
        isActive: true,
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...data
      };
      enemies.push(enemy);
      return enemy;
    },
    async update(id, data) {
      const enemy = enemies.find((e) => e._id === id && e.isActive);
      if (!enemy) return null;
      Object.assign(enemy, data, { updatedAt: new Date() });
      return enemy;
    },
    async softDelete(id) {
      const enemy = enemies.find((e) => e._id === id && e.isActive);
      if (!enemy) return null;
      enemy.isActive = false;
      enemy.deletedAt = new Date();
      return enemy;
    }
  };
}

function createMemoryBossRepository() {
  const bosses = [];

  return {
    bosses,
    async listActive() {
      return bosses.filter((b) => b.isActive);
    },
    async findById(id) {
      return bosses.find((b) => b._id === id && b.isActive) || null;
    },
    async findRandom() {
      const active = bosses.filter((b) => b.isActive);
      if (active.length === 0) return null;
      return active[Math.floor(Math.random() * active.length)];
    },
    async create(data) {
      const boss = {
        _id: makeId(),
        isActive: true,
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...data
      };
      bosses.push(boss);
      return boss;
    },
    async update(id, data) {
      const boss = bosses.find((b) => b._id === id && b.isActive);
      if (!boss) return null;
      Object.assign(boss, data, { updatedAt: new Date() });
      return boss;
    },
    async softDelete(id) {
      const boss = bosses.find((b) => b._id === id && b.isActive);
      if (!boss) return null;
      boss.isActive = false;
      boss.deletedAt = new Date();
      return boss;
    }
  };
}

// ============================================================
// Helpers de teste
// ============================================================

const ADMIN_HEADERS = {
  'X-User-Id': 'user-1',
  'X-User-Role': 'admin'
};

const validCard = {
  name: 'Golpe',
  description: 'Causa 6 de dano.',
  type: 'attack',
  cost: 1,
  value: 6,
  rarity: 'basic',
  isStarter: false
};

const validEnemy = {
  name: 'Goblin',
  description: 'Um goblin ágil.',
  maxHp: 15,
  attack: 4,
  defense: 0,
  difficulty: 1
};

const validBoss = {
  name: 'Guardião das Trevas',
  description: 'Um boss poderoso.',
  maxHp: 150,
  attack: 20,
  specialAttack: 35,
  difficulty: 10
};

// ============================================================
// Testes
// ============================================================

describe('catalog-service', () => {
  let app;
  let cardRepository;
  let enemyRepository;
  let bossRepository;

  beforeEach(() => {
    cardRepository = createMemoryCardRepository();
    enemyRepository = createMemoryEnemyRepository();
    bossRepository = createMemoryBossRepository();
    app = createApp({ cardRepository, enemyRepository, bossRepository });
  });

  // ----------------------------------------------------------
  // Cards
  // ----------------------------------------------------------

  test('POST /cards cria carta válida e retorna 201', async () => {
    const response = await request(app)
      .post('/cards')
      .set(ADMIN_HEADERS)
      .send(validCard);

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      success: true,
      data: {
        name: 'Golpe',
        type: 'attack',
        rarity: 'basic',
        isActive: true
      }
    });
  });

  test('POST /cards rejeita carta com type inválido e retorna 400', async () => {
    const response = await request(app)
      .post('/cards')
      .set(ADMIN_HEADERS)
      .send({ ...validCard, type: 'poison' });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      success: false,
      error: { code: 'VALIDATION_ERROR' }
    });
  });

  test('POST /cards rejeita carta com rarity inválida e retorna 400', async () => {
    const response = await request(app)
      .post('/cards')
      .set(ADMIN_HEADERS)
      .send({ ...validCard, rarity: 'legendary' });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  test('POST /cards rejeita carta com cost negativo e retorna 400', async () => {
    const response = await request(app)
      .post('/cards')
      .set(ADMIN_HEADERS)
      .send({ ...validCard, cost: -1 });

    expect(response.status).toBe(400);
  });

  test('POST /cards rejeita carta com value zero e retorna 400', async () => {
    const response = await request(app)
      .post('/cards')
      .set(ADMIN_HEADERS)
      .send({ ...validCard, value: 0 });

    expect(response.status).toBe(400);
  });

  test('GET /cards retorna apenas cartas ativas', async () => {
    await request(app).post('/cards').set(ADMIN_HEADERS).send(validCard);
    await request(app).post('/cards').set(ADMIN_HEADERS).send({ ...validCard, name: 'Carta B' });

    const firstCard = cardRepository.cards[0];
    await cardRepository.softDelete(firstCard._id);

    const response = await request(app).get('/cards');

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].name).toBe('Carta B');
  });

  test('DELETE /cards/:id executa soft delete e retorna isActive=false', async () => {
    const created = await request(app)
      .post('/cards')
      .set(ADMIN_HEADERS)
      .send(validCard);

    const id = created.body.data._id;

    const response = await request(app)
      .delete(`/cards/${id}`)
      .set(ADMIN_HEADERS);

    expect(response.status).toBe(200);
    expect(response.body.data.isActive).toBe(false);
    expect(response.body.data.deletedAt).not.toBeNull();
  });

  test('DELETE /cards/:id em carta já deletada retorna 404', async () => {
    const created = await request(app)
      .post('/cards')
      .set(ADMIN_HEADERS)
      .send(validCard);

    const id = created.body.data._id;

    await request(app).delete(`/cards/${id}`).set(ADMIN_HEADERS);

    const response = await request(app)
      .delete(`/cards/${id}`)
      .set(ADMIN_HEADERS);

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('CARD_NOT_FOUND');
  });

  test('GET /cards/starter retorna apenas cartas com isStarter=true e ativas', async () => {
    await request(app)
      .post('/cards')
      .set(ADMIN_HEADERS)
      .send({ ...validCard, isStarter: true });

    await request(app)
      .post('/cards')
      .set(ADMIN_HEADERS)
      .send({ ...validCard, name: 'Não Starter', isStarter: false });

    const response = await request(app).get('/cards/starter');

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].isStarter).toBe(true);
  });

  test('GET /cards/:id com ObjectId inválido retorna 400', async () => {
    const response = await request(app).get('/cards/id-invalido');

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('INVALID_ID');
  });

  // ----------------------------------------------------------
  // Enemies
  // ----------------------------------------------------------

  test('POST /enemies cria inimigo válido e retorna 201', async () => {
    const response = await request(app)
      .post('/enemies')
      .set(ADMIN_HEADERS)
      .send(validEnemy);

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      success: true,
      data: {
        name: 'Goblin',
        maxHp: 15,
        isActive: true
      }
    });
  });

  test('POST /enemies rejeita inimigo com maxHp <= 0 e retorna 400', async () => {
    const response = await request(app)
      .post('/enemies')
      .set(ADMIN_HEADERS)
      .send({ ...validEnemy, maxHp: 0 });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  test('POST /enemies rejeita inimigo com difficulty <= 0 e retorna 400', async () => {
    const response = await request(app)
      .post('/enemies')
      .set(ADMIN_HEADERS)
      .send({ ...validEnemy, difficulty: 0 });

    expect(response.status).toBe(400);
  });

  test('GET /enemies/random retorna um inimigo ativo', async () => {
    await request(app).post('/enemies').set(ADMIN_HEADERS).send(validEnemy);

    const response = await request(app).get('/enemies/random');

    expect(response.status).toBe(200);
    expect(response.body.data.name).toBe('Goblin');
  });

  test('GET /enemies/random retorna 404 quando não há inimigos ativos', async () => {
    const response = await request(app).get('/enemies/random');

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('ENEMY_NOT_FOUND');
  });

  test('GET /enemies retorna apenas inimigos ativos', async () => {
    await request(app).post('/enemies').set(ADMIN_HEADERS).send(validEnemy);
    await request(app).post('/enemies').set(ADMIN_HEADERS).send({ ...validEnemy, name: 'Troll' });

    const firstEnemy = enemyRepository.enemies[0];
    await enemyRepository.softDelete(firstEnemy._id);

    const response = await request(app).get('/enemies');

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].name).toBe('Troll');
  });

  // ----------------------------------------------------------
  // Bosses
  // ----------------------------------------------------------

  test('POST /bosses cria boss válido e retorna 201', async () => {
    const response = await request(app)
      .post('/bosses')
      .set(ADMIN_HEADERS)
      .send(validBoss);

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      success: true,
      data: {
        name: 'Guardião das Trevas',
        maxHp: 150,
        isActive: true
      }
    });
  });

  test('POST /bosses rejeita boss com maxHp <= 0 e retorna 400', async () => {
    const response = await request(app)
      .post('/bosses')
      .set(ADMIN_HEADERS)
      .send({ ...validBoss, maxHp: 0 });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  test('GET /bosses/random retorna um boss ativo', async () => {
    await request(app).post('/bosses').set(ADMIN_HEADERS).send(validBoss);

    const response = await request(app).get('/bosses/random');

    expect(response.status).toBe(200);
    expect(response.body.data.name).toBe('Guardião das Trevas');
  });

  test('GET /bosses/random retorna 404 quando não há bosses ativos', async () => {
    const response = await request(app).get('/bosses/random');

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('BOSS_NOT_FOUND');
  });

  // ----------------------------------------------------------
  // Autorização
  // ----------------------------------------------------------

  test('POST /cards sem autenticação retorna 401', async () => {
    const response = await request(app).post('/cards').send(validCard);

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('AUTH_REQUIRED');
  });

  test('POST /cards com usuário comum retorna 403', async () => {
    const response = await request(app)
      .post('/cards')
      .set({ 'X-User-Id': 'user-1', 'X-User-Role': 'user' })
      .send(validCard);

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('FORBIDDEN');
  });

  // ----------------------------------------------------------
  // Health
  // ----------------------------------------------------------

  test('GET /health retorna status ok', async () => {
    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body.data.service).toBe('catalog-service');
    expect(response.body.data.status).toBe('ok');
  });
});
