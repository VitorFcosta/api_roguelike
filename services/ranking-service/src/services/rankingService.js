const { AppError } = require('../errors/AppError');

const RUN_STATUSES = ['victory', 'defeat', 'abandoned'];

function sameEvent(processedRun, event) {
  return String(processedRun.userId) === event.userId
    && processedRun.status === event.status
    && Number(processedRun.floor) === event.floor;
}

function createRankingService({
  rankingRepository,
  processedRunRepository,
  runInTransaction = async (work) => work(undefined)
}) {
  async function findIdempotentResult(event, { session } = {}) {
    const processedRun = await processedRunRepository.findByRunId(event.runId, { session });
    if (!processedRun) return null;

    if (!sameEvent(processedRun, event)) {
      throw new AppError(
        409,
        'RUN_EVENT_CONFLICT',
        'Este runId já foi processado com dados diferentes.'
      );
    }

    return rankingRepository.findByUserId(event.userId, { session });
  }

  async function registerRunResult({ userId, runId, userName, status, result, floor }) {
    const finalStatus = status || result;
    const normalizedRunId = typeof runId === 'string' ? runId.trim() : '';

    if (!userId || !finalStatus || !normalizedRunId) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'runId, userId e status são obrigatórios.');
    }
    if (normalizedRunId.length > 100) {
      throw new AppError(400, 'INVALID_RUN_ID', 'runId deve ter no máximo 100 caracteres.');
    }
    if (!RUN_STATUSES.includes(finalStatus)) {
      throw new AppError(400, 'INVALID_STATUS', 'Status de run inválido.');
    }

    const finalFloor = Number(floor ?? 1);
    if (!Number.isInteger(finalFloor) || finalFloor < 1 || finalFloor > 100) {
      throw new AppError(400, 'INVALID_FLOOR', 'Andar da run inválido.');
    }

    const normalizedUserId = userId.toString();
    const event = {
      runId: normalizedRunId,
      userId: normalizedUserId,
      status: finalStatus,
      floor: finalFloor
    };
    const isVictory = finalStatus === 'victory';
    const calculatedScore = isVictory ? finalFloor * 100 : finalFloor * 10;
    const name = userName || `Jogador-${normalizedUserId.slice(-6)}`;

    try {
      return await runInTransaction(async (session) => {
        const existingResult = await findIdempotentResult(event, { session });
        if (existingResult) return existingResult;

        await processedRunRepository.create(
          { ...event, processedAt: new Date() },
          { session }
        );

        return rankingRepository.upsertResult(
          {
            userId: normalizedUserId,
            userName: name,
            isVictory,
            score: calculatedScore
          },
          { session }
        );
      });
    } catch (error) {
      if (error?.code !== 11000) throw error;

      const existingResult = await findIdempotentResult(event);
      if (existingResult) return existingResult;
      throw error;
    }
  }

  async function getGlobalRanking(options = {}) {
    return rankingRepository.findAll(options);
  }

  async function getUserStats(userId) {
    const entry = await rankingRepository.findByUserId(userId.toString());

    if (!entry) {
      return {
        userId,
        totalRuns: 0,
        victories: 0,
        defeats: 0,
        bestScore: 0,
        bossKills: 0,
        lastRunAt: null
      };
    }

    return entry;
  }

  return { registerRunResult, getGlobalRanking, getUserStats };
}

module.exports = { createRankingService };
