const { AppError } = require('../errors/AppError');

function createRankingService({ rankingRepository }) {

  async function registerRunResult({ userId, runId, userName, status, result, floor }) {
    const finalStatus = status || result;

    if (!userId || !finalStatus) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'userId e status são obrigatórios.');
    }

    if (!['victory', 'defeat', 'abandoned'].includes(finalStatus)) {
      throw new AppError(400, 'INVALID_STATUS', 'Status de run inválido.');
    }

    const finalFloor = Number(floor || 1);
    if (!Number.isInteger(finalFloor) || finalFloor < 1 || finalFloor > 100) {
      throw new AppError(400, 'INVALID_FLOOR', 'Andar da run inválido.');
    }

    const isVictory = finalStatus === 'victory';
    const calculatedScore = isVictory ? finalFloor * 100 : finalFloor * 10;

    // userName é opcional, usa fallback se não vier
    const name = userName || `Jogador-${userId.toString().slice(-6)}`;

    return rankingRepository.upsertResult({
      userId: userId.toString(),
      userName: name,
      isVictory,
      score: calculatedScore,
      runId
    });
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
