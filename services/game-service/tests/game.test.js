/**
 * Testes do game-service
 * Estratégia: repositórios e clientes externos são mocks em memória.
 * Não depende de banco de dados real — roda com jest puro.
 */

const { createGameService } = require('../src/services/gameService');
const mongoose = require('mongoose');

// ─── Helpers ──────────────────────────────────────────────────────────────────

function newId() {
  return new mongoose.Types.ObjectId();
}

const STARTER_CARDS = [
  { cardId: newId(), name: 'Ataque Básico', type: 'attack', cost: 1, value: 6, rarity: 'basic' },
  { cardId: newId(), name: 'Defesa Básica', type: 'block', cost: 1, value: 5, rarity: 'basic' },
  { cardId: newId(), name: 'Cura Básica',   type: 'heal',  cost: 1, value: 4, rarity: 'basic' }
];

const REWARD_CARD = {
  _id: newId(), name: 'Fireball', type: 'attack', cost: 2, value: 12, rarity: 'rare'
};

const REWARD_CARDS = [
  REWARD_CARD,
  { _id: newId(), name: 'Shield Wall', type: 'block', cost: 2, value: 10, rarity: 'common' },
  { _id: newId(), name: 'Greater Heal', type: 'heal', cost: 2, value: 12, rarity: 'rare' }
];

const WEAK_ENEMY = {
  _id: newId(), name: 'Slime', maxHp: 10, attack: 3, defense: 0, specialAttack: 0
};

const STRONG_ENEMY = {
  _id: newId(), name: 'Golem', maxHp: 999, attack: 100, defense: 0, specialAttack: 0
};

const BOSS = {
  _id: newId(), name: 'Dragon', maxHp: 10, attack: 3, defense: 0, specialAttack: 8
};

// ─── In-memory stores ─────────────────────────────────────────────────────────

function makeStores() {
  const runs = new Map();
  const battles = new Map();
  const rewards = new Map();

  const runRepo = {
    async create(data) {
      const doc = { _id: newId(), ...data };
      runs.set(String(doc._id), doc);
      return doc;
    },
    async findById(id) { return runs.get(String(id)) || null; },
    async findByUserId(userId, options = {}) {
      let result = [...runs.values()].filter(r => r.userId === userId);
      if (options.status) {
        result = result.filter(r => r.status === options.status);
      }
      const limit = Number(options.limit) || result.length;
      const page = Number(options.page) || 1;
      return result
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice((page - 1) * limit, page * limit);
    },
    async findActiveByUserId(userId) {
      return [...runs.values()].find(r => r.userId === userId && r.status === 'active') || null;
    },
    async update(id, data) {
      const doc = runs.get(String(id));
      if (!doc) return null;
      Object.assign(doc, data);
      return doc;
    },
    async addCardToDeck(id, card) {
      const doc = runs.get(String(id));
      if (!doc) return null;
      doc.deck.push(card);
      return doc;
    }
  };

  const battleRepo = {
    async create(data) {
      const doc = { _id: newId(), ...data };
      battles.set(String(doc._id), doc);
      return doc;
    },
    async findById(id) { return battles.get(String(id)) || null; },
    async findActiveByRunId(runId) {
      return [...battles.values()].find(b => String(b.runId) === String(runId) && b.status === 'active') || null;
    },
    async update(id, data) {
      const doc = battles.get(String(id));
      if (!doc) return null;
      Object.assign(doc, data);
      return doc;
    }
  };

  const rewardRepo = {
    async create(data) {
      const doc = { _id: newId(), ...data };
      rewards.set(String(doc._id), doc);
      return doc;
    },
    async findById(id) { return rewards.get(String(id)) || null; },
    async findPendingByRunId(runId) {
      return [...rewards.values()].find(r => String(r.runId) === String(runId) && r.status === 'pending') || null;
    },
    async update(id, data) {
      const doc = rewards.get(String(id));
      if (!doc) return null;
      Object.assign(doc, data);
      return doc;
    }
  };

  return { runRepo, battleRepo, rewardRepo };
}

function makeCatalogClient(overrides = {}) {
  return {
    getStarterCards: jest.fn().mockResolvedValue(
      STARTER_CARDS.map(c => ({ _id: c.cardId, ...c }))
    ),
    getRandomEnemy: jest.fn().mockResolvedValue(WEAK_ENEMY),
    getRandomBoss:  jest.fn().mockResolvedValue(BOSS),
    getRewardCards: jest.fn().mockResolvedValue(REWARD_CARDS),
    ...overrides
  };
}

function makeRankingClient() {
  return { registerRunResult: jest.fn().mockResolvedValue(undefined) };
}

function makeService(catalogOverrides = {}) {
  const { runRepo, battleRepo, rewardRepo } = makeStores();
  const service = createGameService({
    runRepository:    runRepo,
    battleRepository: battleRepo,
    rewardRepository: rewardRepo,
    catalogClient:    makeCatalogClient(catalogOverrides),
    rankingClient:    makeRankingClient()
  });
  return { service, runRepo, battleRepo, rewardRepo };
}

const USER_ID  = 'user-001';
const USER2_ID = 'user-002';

// ─── Testes ───────────────────────────────────────────────────────────────────

describe('Iniciar run com deck inicial', () => {
  test('cria run com cartas iniciais e HP cheio', async () => {
    const { service } = makeService();
    const run = await service.createRun(USER_ID);

    expect(run.status).toBe('active');
    expect(run.playerHp).toBe(80);
    expect(run.playerMaxHp).toBe(80);
    expect(run.floor).toBe(1);
    expect(run.deck).toHaveLength(3);
    expect(run.deck.map(c => c.type)).toEqual(
      expect.arrayContaining(['attack', 'block', 'heal'])
    );
  });

  test('não permite duas runs ativas para o mesmo usuário', async () => {
    const { service } = makeService();
    await service.createRun(USER_ID);
    await expect(service.createRun(USER_ID))
      .rejects.toMatchObject({ code: 'RUN_ALREADY_ACTIVE' });
  });

  test('usuários diferentes podem ter runs ativas simultâneas', async () => {
    const { service } = makeService();
    await service.createRun(USER_ID);
    const run2 = await service.createRun(USER2_ID);
    expect(run2.status).toBe('active');
  });
});

describe('Criar batalha comum', () => {
  test('cria batalha do tipo common no andar 1', async () => {
    const { service } = makeService();
    const run = await service.createRun(USER_ID);
    const battle = await service.createBattle(run._id, USER_ID);

    expect(battle.type).toBe('common');
    expect(battle.status).toBe('active');
    expect(battle.enemyName).toBe('Slime');
    expect(battle.enemyCurrentHp).toBe(WEAK_ENEMY.maxHp);
  });

  test('não permite duas batalhas ativas na mesma run', async () => {
    const { service } = makeService();
    const run = await service.createRun(USER_ID);
    await service.createBattle(run._id, USER_ID);
    await expect(service.createBattle(run._id, USER_ID))
      .rejects.toMatchObject({ code: 'BATTLE_ALREADY_ACTIVE' });
  });
});

describe('Usar carta de ataque', () => {
  test('reduz HP do inimigo pelo valor da carta', async () => {
    const { service } = makeService();
    const run = await service.createRun(USER_ID);
    const battle = await service.createBattle(run._id, USER_ID);
    const attackCard = run.deck.find(c => c.type === 'attack');

    const updated = await service.playCard(battle._id, attackCard.cardId, USER_ID);

    // Dano aplicado: 6 (valor) - 0 (defesa do slime) = 6
    expect(updated.enemyCurrentHp).toBe(WEAK_ENEMY.maxHp - 6);
  });

  test('registra log da ação do jogador e do ataque do inimigo', async () => {
    const { service } = makeService();
    const run = await service.createRun(USER_ID);
    const battle = await service.createBattle(run._id, USER_ID);
    const attackCard = run.deck.find(c => c.type === 'attack');

    const updated = await service.playCard(battle._id, attackCard.cardId, USER_ID);

    expect(updated.log).toEqual(
      expect.arrayContaining([
        expect.stringContaining('Jogador usou Ataque Básico'),
        expect.stringContaining('Inimigo atacou')
      ])
    );
  });
});

describe('Usar carta de defesa', () => {
  test('adiciona bloco ao jogador sem danificar inimigo', async () => {
    const { service } = makeService();
    const run = await service.createRun(USER_ID);
    const battle = await service.createBattle(run._id, USER_ID);
    const blockCard = run.deck.find(c => c.type === 'block');

    const updated = await service.playCard(battle._id, blockCard.cardId, USER_ID);

    // Inimigo não foi atacado
    expect(updated.enemyCurrentHp).toBe(WEAK_ENEMY.maxHp);
  });

  test('bloco reduz dano recebido do inimigo', async () => {
    const { service } = makeService();
    const run = await service.createRun(USER_ID);
    const battle = await service.createBattle(run._id, USER_ID);
    const blockCard = run.deck.find(c => c.type === 'block');

    const updated = await service.playCard(battle._id, blockCard.cardId, USER_ID);

    // Inimigo ataca 3, bloco é 5 → sem dano (3 - 5 = 0, min 0)
    expect(updated.playerCurrentHp).toBe(run.playerHp);
  });
});

describe('Usar carta de cura', () => {
  test('restaura HP do jogador', async () => {
    const { service } = makeService();
    const run = await service.createRun(USER_ID);
    const battle = await service.createBattle(run._id, USER_ID);
    const attackCard = run.deck.find(c => c.type === 'attack');
    const healCard   = run.deck.find(c => c.type === 'heal');

    // Leva dano primeiro
    const afterAtk = await service.playCard(battle._id, attackCard.cardId, USER_ID);
    const hpAfterAtk = afterAtk.playerCurrentHp;

    // Cura
    const afterHeal = await service.playCard(battle._id, healCard.cardId, USER_ID);

    // HP subiu em relação ao estado anterior (descontando ataque do inimigo neste turno)
    expect(afterHeal.playerCurrentHp).toBeGreaterThan(hpAfterAtk - WEAK_ENEMY.attack);
  });

  test('cura não ultrapassa HP máximo', async () => {
    const { service } = makeService();
    const run = await service.createRun(USER_ID);
    const battle = await service.createBattle(run._id, USER_ID);
    const healCard = run.deck.find(c => c.type === 'heal');

    // Jogador começa com HP cheio (80) → cura não pode ultrapassar
    const updated = await service.playCard(battle._id, healCard.cardId, USER_ID);
    expect(updated.playerCurrentHp).toBeLessThanOrEqual(run.playerMaxHp);
  });
});

describe('Vencer batalha', () => {
  test('batalha fica com status victory ao zerar HP do inimigo', async () => {
    const { service } = makeService();
    const run = await service.createRun(USER_ID);
    const battle = await service.createBattle(run._id, USER_ID);
    const attackCard = run.deck.find(c => c.type === 'attack');

    // Slime tem 10 HP, ataque 6 → 2 hits para matar
    await service.playCard(battle._id, attackCard.cardId, USER_ID);
    const final = await service.playCard(battle._id, attackCard.cardId, USER_ID);

    expect(final.status).toBe('victory');
    expect(final.enemyCurrentHp).toBe(0);
  });

  test('run avança de andar após vitória comum', async () => {
    const { service } = makeService();
    const run = await service.createRun(USER_ID);
    const battle = await service.createBattle(run._id, USER_ID);
    const attackCard = run.deck.find(c => c.type === 'attack');

    await service.playCard(battle._id, attackCard.cardId, USER_ID);
    await service.playCard(battle._id, attackCard.cardId, USER_ID);

    const updatedRun = await service.getRunById(run._id, USER_ID);
    expect(updatedRun.floor).toBe(2);
  });
});

describe('Gerar recompensa', () => {
  async function winBattle(service, userId) {
    const run = await service.createRun(userId);
    const battle = await service.createBattle(run._id, userId);
    const attackCard = run.deck.find(c => c.type === 'attack');
    await service.playCard(battle._id, attackCard.cardId, userId);
    await service.playCard(battle._id, attackCard.cardId, userId);
    return { run, battle };
  }

  test('gera recompensa após vitória em batalha comum', async () => {
    const { service } = makeService();
    const { run } = await winBattle(service, USER_ID);
    const reward = await service.getRewards(run._id, USER_ID);

    expect(reward.status).toBe('pending');
    expect(reward.options).toHaveLength(3);
  });

  test('falha com erro claro quando catálogo não retorna 3 cartas de recompensa', async () => {
    const { service } = makeService({
      getRewardCards: jest.fn().mockResolvedValue([REWARD_CARD])
    });
    const run = await service.createRun(USER_ID);
    const battle = await service.createBattle(run._id, USER_ID);
    const attackCard = run.deck.find(c => c.type === 'attack');

    await service.playCard(battle._id, attackCard.cardId, USER_ID);

    await expect(service.playCard(battle._id, attackCard.cardId, USER_ID))
      .rejects.toMatchObject({ code: 'INSUFFICIENT_REWARD_CARDS' });
  });

  test('impede nova batalha enquanto há recompensa pendente', async () => {
    const { service } = makeService();
    const { run } = await winBattle(service, USER_ID);
    await expect(service.createBattle(run._id, USER_ID))
      .rejects.toMatchObject({ code: 'REWARD_PENDING' });
  });
});

describe('Escolher recompensa', () => {
  test('escolhe carta e adiciona ao deck', async () => {
    const { service } = makeService();
    const run = await service.createRun(USER_ID);
    const battle = await service.createBattle(run._id, USER_ID);
    const attackCard = run.deck.find(c => c.type === 'attack');

    await service.playCard(battle._id, attackCard.cardId, USER_ID);
    await service.playCard(battle._id, attackCard.cardId, USER_ID);

    const reward = await service.getRewards(run._id, USER_ID);
    const chosenCardId = reward.options[0].cardId;

    const updated = await service.chooseReward(reward._id, chosenCardId, USER_ID);

    expect(updated.status).toBe('chosen');
    expect(String(updated.chosenCardId)).toBe(String(chosenCardId));

    const updatedRun = await service.getRunById(run._id, USER_ID);
    expect(updatedRun.deck).toHaveLength(4);
  });

  test('não permite escolher carta fora das opções', async () => {
    const { service } = makeService();
    const run = await service.createRun(USER_ID);
    const battle = await service.createBattle(run._id, USER_ID);
    const attackCard = run.deck.find(c => c.type === 'attack');

    await service.playCard(battle._id, attackCard.cardId, USER_ID);
    await service.playCard(battle._id, attackCard.cardId, USER_ID);

    const reward = await service.getRewards(run._id, USER_ID);
    await expect(service.chooseReward(reward._id, newId(), USER_ID))
      .rejects.toMatchObject({ code: 'INVALID_CARD_CHOICE' });
  });
});

describe('Finalizar run como derrota', () => {
  test('run fica defeat quando playerHp chega a 0', async () => {
    const { service } = makeService({
      getRandomEnemy: jest.fn().mockResolvedValue(STRONG_ENEMY)
    });
    const run = await service.createRun(USER_ID);
    const battle = await service.createBattle(run._id, USER_ID);
    const attackCard = run.deck.find(c => c.type === 'attack');

    let battleStatus = 'active';
    while (battleStatus === 'active') {
      const b = await service.playCard(battle._id, attackCard.cardId, USER_ID);
      battleStatus = b.status;
    }

    expect(battleStatus).toBe('defeat');
    const updatedRun = await service.getRunById(run._id, USER_ID);
    expect(updatedRun.status).toBe('defeat');
  });

  test('chama rankingClient ao finalizar run como derrota', async () => {
    const { runRepo, battleRepo, rewardRepo } = makeStores();
    const rankingClient = makeRankingClient();
    const service = createGameService({
      runRepository:    runRepo,
      battleRepository: battleRepo,
      rewardRepository: rewardRepo,
      catalogClient:    makeCatalogClient({ getRandomEnemy: jest.fn().mockResolvedValue(STRONG_ENEMY) }),
      rankingClient
    });

    const run = await service.createRun(USER_ID);
    const battle = await service.createBattle(run._id, USER_ID);
    const attackCard = run.deck.find(c => c.type === 'attack');

    let status = 'active';
    while (status === 'active') {
      const b = await service.playCard(battle._id, attackCard.cardId, USER_ID);
      status = b.status;
    }

    expect(rankingClient.registerRunResult).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'defeat', userId: USER_ID, floor: 1 })
    );
  });
});

describe('Finalizar run como vitória contra boss', () => {
  async function advanceToFloor(service, targetFloor) {
    const run = await service.createRun(USER_ID);
    const attackCard = run.deck.find(c => c.type === 'attack');

    for (let floor = 1; floor < targetFloor; floor++) {
      const battle = await service.createBattle(run._id, USER_ID);
      await service.playCard(battle._id, attackCard.cardId, USER_ID);
      await service.playCard(battle._id, attackCard.cardId, USER_ID);
      const reward = await service.getRewards(run._id, USER_ID);
      await service.chooseReward(reward._id, reward.options[0].cardId, USER_ID);
    }
    return { run, attackCard };
  }

  test('batalha no andar 5 ainda é comum', async () => {
    const { service } = makeService();
    const { run } = await advanceToFloor(service, 5);
    const battle = await service.createBattle(run._id, USER_ID);
    expect(battle.type).toBe('common');
    expect(battle.enemyName).toBe('Slime');
  });

  test('batalha no andar 6 é do tipo boss após 5 vitórias comuns', async () => {
    const { service } = makeService();
    const { run } = await advanceToFloor(service, 6);
    const battle = await service.createBattle(run._id, USER_ID);
    expect(battle.type).toBe('boss');
    expect(battle.enemyName).toBe('Dragon');
  });

  test('vencer boss finaliza run como victory', async () => {
    const { service } = makeService();
    const { run } = await advanceToFloor(service, 6);
    const battle = await service.createBattle(run._id, USER_ID);
    const attackCard = run.deck.find(c => c.type === 'attack');

    // Dragon tem 10 HP, ataque 6 → 2 hits
    await service.playCard(battle._id, attackCard.cardId, USER_ID);
    await service.playCard(battle._id, attackCard.cardId, USER_ID);

    const updatedRun = await service.getRunById(run._id, USER_ID);
    expect(updatedRun.status).toBe('victory');
  });

  test('chama rankingClient ao vencer boss', async () => {
    const { runRepo, battleRepo, rewardRepo } = makeStores();
    const rankingClient = makeRankingClient();
    const service = createGameService({
      runRepository:    runRepo,
      battleRepository: battleRepo,
      rewardRepository: rewardRepo,
      catalogClient:    makeCatalogClient(),
      rankingClient
    });

    const run = await service.createRun(USER_ID);
    const attackCard = run.deck.find(c => c.type === 'attack');

    for (let floor = 1; floor < 6; floor++) {
      const battle = await service.createBattle(run._id, USER_ID);
      await service.playCard(battle._id, attackCard.cardId, USER_ID);
      await service.playCard(battle._id, attackCard.cardId, USER_ID);
      const reward = await service.getRewards(run._id, USER_ID);
      await service.chooseReward(reward._id, reward.options[0].cardId, USER_ID);
    }

    const bossBattle = await service.createBattle(run._id, USER_ID);
    await service.playCard(bossBattle._id, attackCard.cardId, USER_ID);
    await service.playCard(bossBattle._id, attackCard.cardId, USER_ID);

    expect(rankingClient.registerRunResult).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'victory', userId: USER_ID })
    );
  });
});

describe('Impedir ação em run finalizada', () => {
  test('não pode iniciar batalha em run finalizada', async () => {
    const { service } = makeService();
    const run = await service.createRun(USER_ID);
    await service.abandonRun(run._id, USER_ID);

    await expect(service.createBattle(run._id, USER_ID))
      .rejects.toMatchObject({ code: 'RUN_NOT_ACTIVE' });
  });

  test('não pode jogar carta em batalha já finalizada', async () => {
    const { service } = makeService({
      getRandomEnemy: jest.fn().mockResolvedValue(STRONG_ENEMY)
    });
    const run = await service.createRun(USER_ID);
    const battle = await service.createBattle(run._id, USER_ID);
    const attackCard = run.deck.find(c => c.type === 'attack');

    let status = 'active';
    while (status === 'active') {
      const b = await service.playCard(battle._id, attackCard.cardId, USER_ID);
      status = b.status;
    }

    await expect(service.playCard(battle._id, attackCard.cardId, USER_ID))
      .rejects.toMatchObject({ code: 'BATTLE_NOT_ACTIVE' });
  });

  test('não pode escolher recompensa já escolhida', async () => {
    const { service } = makeService();
    const run = await service.createRun(USER_ID);
    const battle = await service.createBattle(run._id, USER_ID);
    const attackCard = run.deck.find(c => c.type === 'attack');

    await service.playCard(battle._id, attackCard.cardId, USER_ID);
    await service.playCard(battle._id, attackCard.cardId, USER_ID);

    const reward = await service.getRewards(run._id, USER_ID);
    await service.chooseReward(reward._id, reward.options[0].cardId, USER_ID);

    await expect(service.chooseReward(reward._id, reward.options[0].cardId, USER_ID))
      .rejects.toMatchObject({ code: 'REWARD_ALREADY_CHOSEN' });
  });
});

describe('Casos de erro do jogo', () => {
  test('não retorna recompensa quando não há recompensa pendente', async () => {
    const { service } = makeService();
    const run = await service.createRun(USER_ID);

    await expect(service.getRewards(run._id, USER_ID))
      .rejects.toMatchObject({ code: 'REWARD_NOT_FOUND' });
  });

  test('não permite jogar carta que não está no deck', async () => {
    const { service } = makeService();
    const run = await service.createRun(USER_ID);
    const battle = await service.createBattle(run._id, USER_ID);

    await expect(service.playCard(battle._id, newId(), USER_ID))
      .rejects.toMatchObject({ code: 'CARD_NOT_IN_DECK' });
  });
});

describe('Histórico de runs', () => {
  test('retorna todas as runs do usuário', async () => {
    const { service } = makeService();
    const run = await service.createRun(USER_ID);
    await service.abandonRun(run._id, USER_ID);

    await service.createRun(USER_ID);

    const runs = await service.listRuns(USER_ID);
    expect(runs).toHaveLength(2);
  });

  test('usuário não vê runs de outro usuário', async () => {
    const { service } = makeService();
    await service.createRun(USER_ID);

    const runs2 = await service.listRuns(USER2_ID);
    expect(runs2).toHaveLength(0);
  });

  test('filtra histórico de runs por status', async () => {
    const { service } = makeService();
    const abandoned = await service.createRun(USER_ID);
    await service.abandonRun(abandoned._id, USER_ID);
    await service.createRun(USER_ID);

    const runs = await service.listRuns(USER_ID, { status: 'abandoned' });

    expect(runs).toHaveLength(1);
    expect(runs[0].status).toBe('abandoned');
  });
});

describe('Segurança de consulta de batalha', () => {
  test('usuário não pode consultar run de outro usuário', async () => {
    const { service } = makeService();
    const run = await service.createRun(USER_ID);

    await expect(service.getRunById(run._id, USER2_ID))
      .rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  test('usuário não pode consultar batalha de run de outro usuário', async () => {
    const { service } = makeService();
    const run = await service.createRun(USER_ID);
    const battle = await service.createBattle(run._id, USER_ID);

    await expect(service.getBattleById(battle._id, USER2_ID))
      .rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  test('usuário não pode jogar carta em batalha de outro usuário', async () => {
    const { service } = makeService();
    const run = await service.createRun(USER_ID);
    const battle = await service.createBattle(run._id, USER_ID);
    const attackCard = run.deck.find(c => c.type === 'attack');

    await expect(service.playCard(battle._id, attackCard.cardId, USER2_ID))
      .rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  test('usuário não pode consultar recompensa de run de outro usuário', async () => {
    const { service } = makeService();
    const run = await service.createRun(USER_ID);
    const battle = await service.createBattle(run._id, USER_ID);
    const attackCard = run.deck.find(c => c.type === 'attack');

    await service.playCard(battle._id, attackCard.cardId, USER_ID);
    await service.playCard(battle._id, attackCard.cardId, USER_ID);

    await expect(service.getRewards(run._id, USER2_ID))
      .rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  test('usuário não pode escolher recompensa de outro usuário', async () => {
    const { service } = makeService();
    const run = await service.createRun(USER_ID);
    const battle = await service.createBattle(run._id, USER_ID);
    const attackCard = run.deck.find(c => c.type === 'attack');

    await service.playCard(battle._id, attackCard.cardId, USER_ID);
    await service.playCard(battle._id, attackCard.cardId, USER_ID);

    const reward = await service.getRewards(run._id, USER_ID);

    await expect(service.chooseReward(reward._id, reward.options[0].cardId, USER2_ID))
      .rejects.toMatchObject({ code: 'FORBIDDEN' });
  });
});
