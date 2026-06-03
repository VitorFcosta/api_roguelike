const { AppError } = require('../errors/AppError');

function createRankingService({ rankingRepository }) {

  async function registerRunResult({ userId, runId, userName, status, floor }) {
    if (!userId || !status) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'userId e status são obrigatórios.');
    }

    const isVictory = status === 'victory';
    const score = isVictory ? (floor || 1) * 100 : (floor || 1) * 10;

    // userName é opcional, usa fallback se não vier
    const name = userName || `Jogador-${userId.toString().slice(-6)}`;

    return rankingRepository.upsertResult({
      userId: userId.toString(),
      userName: name,
      isVictory,
      score
    });
  }

  async function getGlobalRanking() {
    return rankingRepository.findAll();
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
