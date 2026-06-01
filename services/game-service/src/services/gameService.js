const { AppError } = require('../errors/AppError');

const PLAYER_MAX_HP = 80;
const BOSS_FLOOR = 5; // A batalha do boss ocorre no andar 5

function createGameService({
  runRepository,
  battleRepository,
  rewardRepository,
  catalogClient,
  rankingClient
}) {
  // ─── RUN ───────────────────────────────────────────────────────────────────

  async function createRun(userId) {
    // Impede múltiplas runs ativas simultaneamente
    const existing = await runRepository.findActiveByUserId(userId);
    if (existing) {
      throw new AppError(409, 'RUN_ALREADY_ACTIVE', 'Você já possui uma run ativa.');
    }

    const starterCards = await catalogClient.getStarterCards();
    if (!starterCards || starterCards.length === 0) {
      throw new AppError(503, 'NO_STARTER_CARDS', 'Nenhuma carta inicial disponível.');
    }

    const deck = starterCards.map((c) => ({
      cardId: c._id,
      name: c.name,
      type: c.type,
      cost: c.cost,
      value: c.value,
      rarity: c.rarity
    }));

    return runRepository.create({
      userId,
      status: 'active',
      playerHp: PLAYER_MAX_HP,
      playerMaxHp: PLAYER_MAX_HP,
      floor: 1,
      deck
    });
  }

  async function listRuns(userId) {
    return runRepository.findByUserId(userId);
  }

  async function getRunById(id, userId) {
    const run = await runRepository.findById(id);
    if (!run) {
      throw new AppError(404, 'RUN_NOT_FOUND', 'Run não encontrada.');
    }
    if (run.userId !== userId) {
      throw new AppError(403, 'FORBIDDEN', 'Acesso negado.');
    }
    return run;
  }

  async function abandonRun(runId, userId) {
    const run = await getRunById(runId, userId);
    if (run.status !== 'active') {
      throw new AppError(400, 'RUN_NOT_ACTIVE', 'A run não está ativa.');
    }

    const updated = await runRepository.update(runId, {
      status: 'abandoned',
      finishedAt: new Date()
    });

    await rankingClient.registerRunResult({
      userId,
      runId,
      status: 'abandoned',
      floor: run.floor
    });

    return updated;
  }

  // ─── BATTLE ────────────────────────────────────────────────────────────────

  async function createBattle(runId, userId) {
    const run = await getRunById(runId, userId);

    if (run.status !== 'active') {
      throw new AppError(400, 'RUN_NOT_ACTIVE', 'A run não está ativa.');
    }

    // Verifica se existe recompensa pendente
    const pendingReward = await rewardRepository.findPendingByRunId(runId);
    if (pendingReward) {
      throw new AppError(
        400,
        'REWARD_PENDING',
        'Escolha sua recompensa antes de iniciar uma nova batalha.'
      );
    }

    // Verifica se já existe batalha ativa
    const activeBattle = await battleRepository.findActiveByRunId(runId);
    if (activeBattle) {
      throw new AppError(409, 'BATTLE_ALREADY_ACTIVE', 'Já existe uma batalha ativa nesta run.');
    }

    const isBossFloor = run.floor === BOSS_FLOOR;

    let enemy;
    let battleType;

    if (isBossFloor) {
      enemy = await catalogClient.getRandomBoss();
      if (!enemy) {
        throw new AppError(503, 'NO_BOSS_AVAILABLE', 'Nenhum boss disponível.');
      }
      battleType = 'boss';
    } else {
      enemy = await catalogClient.getRandomEnemy();
      if (!enemy) {
        throw new AppError(503, 'NO_ENEMY_AVAILABLE', 'Nenhum inimigo disponível.');
      }
      battleType = 'common';
    }

    return battleRepository.create({
      runId,
      type: battleType,
      status: 'active',
      enemyId: enemy._id,
      enemyName: enemy.name,
      enemyMaxHp: enemy.maxHp,
      enemyCurrentHp: enemy.maxHp,
      enemyAttack: enemy.attack,
      enemyDefense: enemy.defense || 0,
      enemySpecialAttack: enemy.specialAttack || 0,
      playerHpAtStart: run.playerHp,
      playerCurrentHp: run.playerHp,
      playerBlock: 0,
      turn: 1
    });
  }

  async function getBattleById(battleId) {
    const battle = await battleRepository.findById(battleId);
    if (!battle) {
      throw new AppError(404, 'BATTLE_NOT_FOUND', 'Batalha não encontrada.');
    }
    return battle;
  }

  // ─── PLAY CARD ─────────────────────────────────────────────────────────────

  async function playCard(battleId, cardId, userId) {
    const battle = await battleRepository.findById(battleId);
    if (!battle) {
      throw new AppError(404, 'BATTLE_NOT_FOUND', 'Batalha não encontrada.');
    }
    if (battle.status !== 'active') {
      throw new AppError(400, 'BATTLE_NOT_ACTIVE', 'A batalha não está ativa.');
    }

    const run = await runRepository.findById(battle.runId);
    if (!run) {
      throw new AppError(404, 'RUN_NOT_FOUND', 'Run não encontrada.');
    }
    if (run.userId !== userId) {
      throw new AppError(403, 'FORBIDDEN', 'Acesso negado.');
    }
    if (run.status !== 'active') {
      throw new AppError(400, 'RUN_NOT_ACTIVE', 'A run não está ativa.');
    }

    // Encontra a carta no deck
    const card = run.deck.find((c) => String(c.cardId) === String(cardId));
    if (!card) {
      throw new AppError(404, 'CARD_NOT_IN_DECK', 'Carta não encontrada no deck.');
    }

    let { playerCurrentHp, playerBlock, enemyCurrentHp } = battle;

    // ── Aplica efeito da carta ──
    if (card.type === 'attack') {
      const rawDamage = card.value;
      const blockedByEnemy = Math.min(rawDamage, battle.enemyDefense);
      const actualDamage = rawDamage - blockedByEnemy;
      enemyCurrentHp = Math.max(0, enemyCurrentHp - actualDamage);
    } else if (card.type === 'block') {
      playerBlock += card.value;
    } else if (card.type === 'heal') {
      playerCurrentHp = Math.min(run.playerMaxHp, playerCurrentHp + card.value);
    }

    // ── Ataque automático do inimigo ──
    const isEnemyAlive = enemyCurrentHp > 0;
    if (isEnemyAlive) {
      let enemyDamage = battle.enemyAttack;

      // Boss: a cada 3 turnos usa ataque especial
      if (battle.type === 'boss' && battle.turn % 3 === 0) {
        enemyDamage = battle.enemySpecialAttack || battle.enemyAttack * 2;
      }

      const damageAfterBlock = Math.max(0, enemyDamage - playerBlock);
      playerCurrentHp = Math.max(0, playerCurrentHp - damageAfterBlock);
      playerBlock = Math.max(0, playerBlock - enemyDamage); // bloco se esgota
    }

    const playerDied = playerCurrentHp <= 0;
    const enemyDied = enemyCurrentHp <= 0;

    const nextTurn = battle.turn + 1;
    let battleStatus = 'active';
    let battleFinishedAt = null;

    if (enemyDied) {
      battleStatus = 'victory';
      battleFinishedAt = new Date();
    } else if (playerDied) {
      battleStatus = 'defeat';
      battleFinishedAt = new Date();
    }

    // Atualiza batalha
    const updatedBattle = await battleRepository.update(battleId, {
      playerCurrentHp,
      playerBlock: Math.max(0, playerBlock),
      enemyCurrentHp,
      turn: nextTurn,
      status: battleStatus,
      finishedAt: battleFinishedAt
    });

    // Atualiza HP do jogador na run
    await runRepository.update(run._id, { playerHp: playerCurrentHp });

    // ── Pós-batalha ──
    if (battleStatus === 'victory') {
      await _handleVictory(run, updatedBattle);
    } else if (battleStatus === 'defeat') {
      await _handleDefeat(run, userId);
    }

    return updatedBattle;
  }

  // ─── HANDLERS PÓS-BATALHA ─────────────────────────────────────────────────

  async function _handleVictory(run, battle) {
    const isBossVictory = battle.type === 'boss';

    if (isBossVictory) {
      // Vitória total da run
      await runRepository.update(run._id, {
        status: 'victory',
        finishedAt: new Date()
      });
      await rankingClient.registerRunResult({
        userId: run.userId,
        runId: run._id,
        status: 'victory',
        floor: run.floor
      });
    } else {
      // Avança andar e gera recompensa
      await runRepository.update(run._id, { floor: run.floor + 1 });
      await _generateReward(run._id, battle._id);
    }
  }

  async function _handleDefeat(run, userId) {
    await runRepository.update(run._id, {
      status: 'defeat',
      finishedAt: new Date()
    });
    await rankingClient.registerRunResult({
      userId,
      runId: run._id,
      status: 'defeat',
      floor: run.floor
    });
  }

  // ─── REWARD ────────────────────────────────────────────────────────────────

  async function _generateReward(runId, battleId) {
    const cards = await catalogClient.getRewardCards(3);

    const options = cards.map((c) => ({
      cardId: c._id,
      name: c.name,
      type: c.type,
      cost: c.cost,
      value: c.value,
      rarity: c.rarity
    }));

    return rewardRepository.create({ runId, battleId, status: 'pending', options });
  }

  async function getRewards(runId, userId) {
    // Valida acesso à run
    await getRunById(runId, userId);

    const reward = await rewardRepository.findPendingByRunId(runId);
    if (!reward) {
      throw new AppError(404, 'REWARD_NOT_FOUND', 'Nenhuma recompensa pendente nesta run.');
    }
    return reward;
  }

  async function chooseReward(rewardId, cardId, userId) {
    const reward = await rewardRepository.findById(rewardId);
    if (!reward) {
      throw new AppError(404, 'REWARD_NOT_FOUND', 'Recompensa não encontrada.');
    }
    if (reward.status !== 'pending') {
      throw new AppError(400, 'REWARD_ALREADY_CHOSEN', 'Recompensa já foi escolhida.');
    }

    // Valida acesso à run
    const run = await getRunById(reward.runId, userId);
    if (run.status !== 'active') {
      throw new AppError(400, 'RUN_NOT_ACTIVE', 'A run não está ativa.');
    }

    // Valida se a carta escolhida é uma das opções
    const chosen = reward.options.find((o) => String(o.cardId) === String(cardId));
    if (!chosen) {
      throw new AppError(400, 'INVALID_CARD_CHOICE', 'Carta inválida para esta recompensa.');
    }

    // Adiciona carta ao deck da run
    await runRepository.addCardToDeck(reward.runId, chosen);

    // Marca recompensa como escolhida
    return rewardRepository.update(rewardId, {
      status: 'chosen',
      chosenCardId: chosen.cardId,
      chosenAt: new Date()
    });
  }

  return {
    createRun,
    listRuns,
    getRunById,
    abandonRun,
    createBattle,
    getBattleById,
    playCard,
    getRewards,
    chooseReward
  };
}

module.exports = { createGameService };
