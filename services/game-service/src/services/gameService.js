const { AppError } = require('../errors/AppError');
const { resolveTurn } = require('../domain/battleEngine');

const PLAYER_MAX_HP = 80;
const COMMON_BATTLE_COUNT = 5;
const BOSS_FLOOR = COMMON_BATTLE_COUNT + 1;

function isDuplicateKey(error) {
  return error?.code === 11000;
}

function mapCards(cards) {
  return cards.map((card) => ({
    cardId: card._id,
    name: card.name,
    type: card.type,
    cost: card.cost,
    value: card.value,
    rarity: card.rarity
  }));
}

function createGameService({
  runRepository,
  battleRepository,
  rewardRepository,
  outboxRepository,
  catalogClient,
  runInTransaction = async (work) => work(undefined)
}) {
  async function getRunById(id, userId, { session } = {}) {
    const run = await runRepository.findById(id, { session });

    if (!run) {
      throw new AppError(404, 'RUN_NOT_FOUND', 'Run não encontrada.');
    }
    if (String(run.userId) !== String(userId)) {
      throw new AppError(403, 'FORBIDDEN', 'Acesso negado.');
    }

    return run;
  }

  async function createRun(userId) {
    const existing = await runRepository.findActiveByUserId(userId);
    if (existing) {
      throw new AppError(409, 'RUN_ALREADY_ACTIVE', 'Você já possui uma run ativa.');
    }

    const starterCards = await catalogClient.getStarterCards();
    if (!starterCards || starterCards.length === 0) {
      throw new AppError(503, 'NO_STARTER_CARDS', 'Nenhuma carta inicial disponível.');
    }

    try {
      return await runRepository.create({
        userId,
        status: 'active',
        playerHp: PLAYER_MAX_HP,
        playerMaxHp: PLAYER_MAX_HP,
        floor: 1,
        deck: mapCards(starterCards)
      });
    } catch (error) {
      if (isDuplicateKey(error)) {
        throw new AppError(409, 'RUN_ALREADY_ACTIVE', 'Você já possui uma run ativa.');
      }
      throw error;
    }
  }

  async function listRuns(userId, options = {}) {
    return runRepository.findByUserId(userId, options);
  }

  async function abandonRun(runId, userId) {
    return runInTransaction(async (session) => {
      const run = await getRunById(runId, userId, { session });
      if (run.status !== 'active') {
        throw new AppError(400, 'RUN_NOT_ACTIVE', 'A run não está ativa.');
      }

      const updated = await runRepository.updateIfStatus(
        runId,
        'active',
        { status: 'abandoned', finishedAt: new Date() },
        { session }
      );

      if (!updated) {
        throw new AppError(409, 'RUN_STATE_CHANGED', 'A run foi alterada por outra ação.');
      }

      await outboxRepository.createRunFinished(
        { userId, runId, status: 'abandoned', floor: run.floor },
        { session }
      );

      return updated;
    });
  }

  async function createBattle(runId, userId) {
    const runSnapshot = await getRunById(runId, userId);
    if (runSnapshot.status !== 'active') {
      throw new AppError(400, 'RUN_NOT_ACTIVE', 'A run não está ativa.');
    }

    const pendingReward = await rewardRepository.findPendingByRunId(runId);
    if (pendingReward) {
      throw new AppError(400, 'REWARD_PENDING', 'Escolha sua recompensa antes de iniciar uma nova batalha.');
    }

    const activeBattle = await battleRepository.findActiveByRunId(runId);
    if (activeBattle) {
      throw new AppError(409, 'BATTLE_ALREADY_ACTIVE', 'Já existe uma batalha ativa nesta run.');
    }

    const isBossFloor = runSnapshot.floor === BOSS_FLOOR;
    const enemy = isBossFloor
      ? await catalogClient.getRandomBoss()
      : await catalogClient.getRandomEnemy();

    if (!enemy) {
      const code = isBossFloor ? 'NO_BOSS_AVAILABLE' : 'NO_ENEMY_AVAILABLE';
      const message = isBossFloor ? 'Nenhum boss disponível.' : 'Nenhum inimigo disponível.';
      throw new AppError(503, code, message);
    }

    try {
      return await runInTransaction(async (session) => {
        const currentRun = await getRunById(runId, userId, { session });
        if (currentRun.status !== 'active') {
          throw new AppError(400, 'RUN_NOT_ACTIVE', 'A run não está ativa.');
        }
        if (currentRun.floor !== runSnapshot.floor) {
          throw new AppError(409, 'RUN_STATE_CHANGED', 'O andar da run foi alterado. Tente novamente.');
        }

        const currentReward = await rewardRepository.findPendingByRunId(runId, { session });
        if (currentReward) {
          throw new AppError(400, 'REWARD_PENDING', 'Escolha sua recompensa antes de iniciar uma nova batalha.');
        }

        const currentBattle = await battleRepository.findActiveByRunId(runId, { session });
        if (currentBattle) {
          throw new AppError(409, 'BATTLE_ALREADY_ACTIVE', 'Já existe uma batalha ativa nesta run.');
        }

        return battleRepository.create(
          {
            runId,
            type: isBossFloor ? 'boss' : 'common',
            status: 'active',
            enemyId: enemy._id,
            enemyName: enemy.name,
            enemyMaxHp: enemy.maxHp,
            enemyCurrentHp: enemy.maxHp,
            enemyAttack: enemy.attack,
            enemyDefense: enemy.defense || 0,
            enemySpecialAttack: enemy.specialAttack || 0,
            playerHpAtStart: currentRun.playerHp,
            playerCurrentHp: currentRun.playerHp,
            playerBlock: 0,
            turn: 1,
            log: [`Batalha contra ${enemy.name} iniciada.`]
          },
          { session }
        );
      });
    } catch (error) {
      if (isDuplicateKey(error)) {
        throw new AppError(409, 'BATTLE_ALREADY_ACTIVE', 'Já existe uma batalha ativa nesta run.');
      }
      throw error;
    }
  }

  async function getBattleById(battleId, userId) {
    const battle = await battleRepository.findById(battleId);
    if (!battle) {
      throw new AppError(404, 'BATTLE_NOT_FOUND', 'Batalha não encontrada.');
    }

    await getRunById(battle.runId, userId);
    return battle;
  }

  async function playCard(battleId, cardId, userId) {
    const battleSnapshot = await battleRepository.findById(battleId);
    if (!battleSnapshot) {
      throw new AppError(404, 'BATTLE_NOT_FOUND', 'Batalha não encontrada.');
    }
    if (battleSnapshot.status !== 'active') {
      throw new AppError(400, 'BATTLE_NOT_ACTIVE', 'A batalha não está ativa.');
    }

    const runSnapshot = await getRunById(battleSnapshot.runId, userId);
    if (runSnapshot.status !== 'active') {
      throw new AppError(400, 'RUN_NOT_ACTIVE', 'A run não está ativa.');
    }

    const cardSnapshot = runSnapshot.deck.find((card) => String(card.cardId) === String(cardId));
    if (!cardSnapshot) {
      throw new AppError(404, 'CARD_NOT_IN_DECK', 'Carta não encontrada no deck.');
    }

    const preview = resolveTurn({ battle: battleSnapshot, run: runSnapshot, card: cardSnapshot });
    let rewardOptions = null;

    if (preview.outcome === 'victory' && battleSnapshot.type === 'common') {
      const cards = await catalogClient.getRewardCards(3);
      if (!Array.isArray(cards) || cards.length < 3) {
        throw new AppError(
          503,
          'INSUFFICIENT_REWARD_CARDS',
          'Catálogo não possui 3 cartas de recompensa disponíveis.'
        );
      }
      rewardOptions = mapCards(cards.slice(0, 3));
    }

    return runInTransaction(async (session) => {
      const battle = await battleRepository.findById(battleId, { session });
      if (!battle || battle.status !== 'active' || battle.turn !== battleSnapshot.turn) {
        throw new AppError(409, 'BATTLE_STATE_CHANGED', 'A batalha foi alterada por outra ação.');
      }

      const run = await getRunById(battle.runId, userId, { session });
      if (run.status !== 'active') {
        throw new AppError(400, 'RUN_NOT_ACTIVE', 'A run não está ativa.');
      }

      const card = run.deck.find((item) => String(item.cardId) === String(cardId));
      if (!card) {
        throw new AppError(404, 'CARD_NOT_IN_DECK', 'Carta não encontrada no deck.');
      }

      const resolution = resolveTurn({ battle, run, card });
      if (resolution.outcome === 'victory' && battle.type === 'common' && !rewardOptions) {
        throw new AppError(409, 'BATTLE_STATE_CHANGED', 'O resultado da batalha mudou. Tente novamente.');
      }

      const updatedBattle = await battleRepository.updateIfActiveAtTurn(
        battleId,
        battle.turn,
        resolution.battlePatch,
        { session }
      );
      if (!updatedBattle) {
        throw new AppError(409, 'BATTLE_STATE_CHANGED', 'A batalha foi alterada por outra ação.');
      }

      const runPatch = { playerHp: resolution.playerCurrentHp };
      if (resolution.outcome === 'victory' && battle.type === 'common') {
        runPatch.floor = run.floor + 1;
      } else if (resolution.outcome === 'victory') {
        runPatch.status = 'victory';
        runPatch.finishedAt = resolution.battlePatch.finishedAt;
      } else if (resolution.outcome === 'defeat') {
        runPatch.status = 'defeat';
        runPatch.finishedAt = resolution.battlePatch.finishedAt;
      }

      const updatedRun = await runRepository.updateIfStatus(
        run._id,
        'active',
        runPatch,
        { session }
      );
      if (!updatedRun) {
        throw new AppError(409, 'RUN_STATE_CHANGED', 'A run foi alterada por outra ação.');
      }

      if (resolution.outcome === 'victory' && battle.type === 'common') {
        await rewardRepository.create(
          { runId: run._id, battleId: battle._id, status: 'pending', options: rewardOptions },
          { session }
        );
      } else if (resolution.outcome === 'victory' || resolution.outcome === 'defeat') {
        await outboxRepository.createRunFinished(
          {
            userId: run.userId,
            runId: run._id,
            status: resolution.outcome,
            floor: run.floor
          },
          { session }
        );
      }

      return updatedBattle;
    });
  }

  async function getRewards(runId, userId) {
    await getRunById(runId, userId);
    const reward = await rewardRepository.findPendingByRunId(runId);
    if (!reward) {
      throw new AppError(404, 'REWARD_NOT_FOUND', 'Nenhuma recompensa pendente nesta run.');
    }
    return reward;
  }

  async function chooseReward(rewardId, cardId, userId) {
    return runInTransaction(async (session) => {
      const reward = await rewardRepository.findById(rewardId, { session });
      if (!reward) {
        throw new AppError(404, 'REWARD_NOT_FOUND', 'Recompensa não encontrada.');
      }
      if (reward.status !== 'pending') {
        throw new AppError(400, 'REWARD_ALREADY_CHOSEN', 'Recompensa já foi escolhida.');
      }

      const run = await getRunById(reward.runId, userId, { session });
      if (run.status !== 'active') {
        throw new AppError(400, 'RUN_NOT_ACTIVE', 'A run não está ativa.');
      }

      const chosen = reward.options.find((option) => String(option.cardId) === String(cardId));
      if (!chosen) {
        throw new AppError(400, 'INVALID_CARD_CHOICE', 'Carta inválida para esta recompensa.');
      }

      const claimedReward = await rewardRepository.claim(rewardId, chosen.cardId, { session });
      if (!claimedReward) {
        throw new AppError(409, 'REWARD_ALREADY_CHOSEN', 'Esta recompensa já foi escolhida por outra ação.');
      }

      const updatedRun = await runRepository.addCardToDeck(reward.runId, chosen, { session });
      if (!updatedRun) {
        throw new AppError(500, 'RUN_UPDATE_FAILED', 'Não foi possível adicionar a carta ao deck.');
      }

      return claimedReward;
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
