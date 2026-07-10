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
    async listActive(options = {}) {
      let result = cards.filter((c) => c.isActive);
      if (options.name) {
        result = result.filter((c) => c.name.toLowerCase().includes(options.name.toLowerCase()));
      }
      if (options.type) {
        result = result.filter((c) => c.type === options.type);
      }
      if (options.rarity) {
        result = result.filter((c) => c.rarity === options.rarity);
      }
      if (options.isStarter !== undefined) {
        result = result.filter((c) => String(c.isStarter) === String(options.isStarter));
      }
      if (options.sort === 'name') {
        result = [...result].sort((a, b) => a.name.localeCompare(b.name));
      }
      const limit = Number(options.limit) || result.length;
      const page = Number(options.page) || 1;
      return result.slice((page - 1) * limit, page * limit);
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
    async listActive(options = {}) {
      let result = enemies.filter((e) => e.isActive);
      if (options.name) {
        result = result.filter((e) => e.name.toLowerCase().includes(options.name.toLowerCase()));
      }
      if (options.difficulty) {
        result = result.filter((e) => String(e.difficulty) === String(options.difficulty));
      }
      const limit = Number(options.limit) || result.length;
      const page = Number(options.page) || 1;
      return result.slice((page - 1) * limit, page * limit);
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
    async listActive(options = {}) {
      let result = bosses.filter((b) => b.isActive);
      if (options.name) {
        result = result.filter((b) => b.name.toLowerCase().includes(options.name.toLowerCase()));
      }
      if (options.difficulty) {
        result = result.filter((b) => String(b.difficulty) === String(options.difficulty));
      }
      const limit = Number(options.limit) || result.length;
      const page = Number(options.page) || 1;
      return result.slice((page - 1) * limit, page * limit);
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
  'X-User-Role': 'admin',
  'X-Internal-Service-Secret': 'test_internal_secret'
};

const USER_HEADERS = {
  'X-User-Id': 'user-1',
  'X-User-Role': 'user',
  'X-Internal-Service-Secret': 'test_internal_secret'
};

const INTERNAL_HEADERS = {
  'X-Internal-Service-Secret': 'test_internal_secret'
};

const TEST_CONFIG = {
  internalServiceSecret: 'test_internal_secret'
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
    app = createApp({
      cardRepository,
      enemyRepository,
      bossRepository,
      config: TEST_CONFIG,
      isDatabaseReady: () => true
    });
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

  test('GET /cards aplica filtros e paginação simples', async () => {
    await request(app)
      .post('/cards')
      .set(ADMIN_HEADERS)
      .send({ ...validCard, name: 'Ataque Raro', rarity: 'rare' });
    await request(app)
      .post('/cards')
      .set(ADMIN_HEADERS)
      .send({ ...validCard, name: 'Defesa Comum', type: 'block', rarity: 'common' });
    await request(app)
      .post('/cards')
      .set(ADMIN_HEADERS)
      .send({ ...validCard, name: 'Ataque Comum', rarity: 'common' });

    const response = await request(app)
      .get('/cards?type=attack&rarity=common&limit=1&page=1&sort=name');

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].name).toBe('Ataque Comum');
  });

  test('PUT /cards/:id atualiza carta como admin', async () => {
    const created = await request(app)
      .post('/cards')
      .set(ADMIN_HEADERS)
      .send(validCard);

    const id = created.body.data._id;

    const response = await request(app)
      .put(`/cards/${id}`)
      .set(ADMIN_HEADERS)
      .send({
        name: 'Golpe Aprimorado',
        value: 9,
        rarity: 'common'
      });

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({
      _id: id,
      name: 'Golpe Aprimorado',
      value: 9,
      rarity: 'common',
      isActive: true
    });
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

  test('GET /enemies aplica filtros simples', async () => {
    await request(app).post('/enemies').set(ADMIN_HEADERS).send(validEnemy);
    await request(app)
      .post('/enemies')
      .set(ADMIN_HEADERS)
      .send({ ...validEnemy, name: 'Troll', difficulty: 4 });

    const response = await request(app).get('/enemies?difficulty=4&limit=1');

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].name).toBe('Troll');
  });

  test('PUT /enemies/:id atualiza inimigo como admin', async () => {
    const created = await request(app)
      .post('/enemies')
      .set(ADMIN_HEADERS)
      .send(validEnemy);

    const id = created.body.data._id;

    const response = await request(app)
      .put(`/enemies/${id}`)
      .set(ADMIN_HEADERS)
      .send({
        name: 'Goblin Veterano',
        maxHp: 25,
        attack: 7,
        difficulty: 3
      });

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({
      _id: id,
      name: 'Goblin Veterano',
      maxHp: 25,
      attack: 7,
      difficulty: 3,
      isActive: true
    });
  });

  test('DELETE /enemies/:id executa soft delete e remove da listagem ativa', async () => {
    const created = await request(app)
      .post('/enemies')
      .set(ADMIN_HEADERS)
      .send(validEnemy);

    const id = created.body.data._id;

    const deleteResponse = await request(app)
      .delete(`/enemies/${id}`)
      .set(ADMIN_HEADERS);

    expect(deleteResponse.status).toBe(200);
    expect(deleteResponse.body.data.isActive).toBe(false);
    expect(deleteResponse.body.data.deletedAt).not.toBeNull();

    const listResponse = await request(app).get('/enemies');
    expect(listResponse.status).toBe(200);
    expect(listResponse.body.data).toHaveLength(0);
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

  test('GET /bosses aplica filtros simples', async () => {
    await request(app).post('/bosses').set(ADMIN_HEADERS).send(validBoss);
    await request(app)
      .post('/bosses')
      .set(ADMIN_HEADERS)
      .send({ ...validBoss, name: 'Leshen', difficulty: 5 });

    const response = await request(app).get('/bosses?name=lesh&limit=1');

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].name).toBe('Leshen');
  });

  test('PUT /bosses/:id atualiza boss como admin', async () => {
    const created = await request(app)
      .post('/bosses')
      .set(ADMIN_HEADERS)
      .send(validBoss);

    const id = created.body.data._id;

    const response = await request(app)
      .put(`/bosses/${id}`)
      .set(ADMIN_HEADERS)
      .send({
        name: 'Guardião Ancestral',
        maxHp: 180,
        attack: 25,
        specialAttack: 45,
        difficulty: 12
      });

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({
      _id: id,
      name: 'Guardião Ancestral',
      maxHp: 180,
      attack: 25,
      specialAttack: 45,
      difficulty: 12,
      isActive: true
    });
  });

  test('DELETE /bosses/:id executa soft delete e remove da listagem ativa', async () => {
    const created = await request(app)
      .post('/bosses')
      .set(ADMIN_HEADERS)
      .send(validBoss);

    const id = created.body.data._id;

    const deleteResponse = await request(app)
      .delete(`/bosses/${id}`)
      .set(ADMIN_HEADERS);

    expect(deleteResponse.status).toBe(200);
    expect(deleteResponse.body.data.isActive).toBe(false);
    expect(deleteResponse.body.data.deletedAt).not.toBeNull();

    const listResponse = await request(app).get('/bosses');
    expect(listResponse.status).toBe(200);
    expect(listResponse.body.data).toHaveLength(0);
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
    expect(response.body.error.code).toBe('INTERNAL_AUTH_REQUIRED');
  });

  test('POST /cards com segredo interno mas sem usuario retorna 401', async () => {
    const response = await request(app)
      .post('/cards')
      .set(INTERNAL_HEADERS)
      .send(validCard);

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('AUTH_REQUIRED');
  });

  test('POST /cards com usuário comum retorna 403', async () => {
    const response = await request(app)
      .post('/cards')
      .set(USER_HEADERS)
      .send(validCard);

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('FORBIDDEN');
  });

  test('POST /enemies com usuário comum retorna 403', async () => {
    const response = await request(app)
      .post('/enemies')
      .set(USER_HEADERS)
      .send(validEnemy);

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('FORBIDDEN');
  });

  test('POST /bosses com usuário comum retorna 403', async () => {
    const response = await request(app)
      .post('/bosses')
      .set(USER_HEADERS)
      .send(validBoss);

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

  test('GET /health retorna 503 quando o banco não está pronto', async () => {
    const unavailableApp = createApp({
      cardRepository,
      enemyRepository,
      bossRepository,
      config: TEST_CONFIG,
      isDatabaseReady: () => false
    });

    const response = await request(unavailableApp).get('/health');

    expect(response.status).toBe(503);
    expect(response.body.error.code).toBe('DATABASE_NOT_READY');
  });
});
