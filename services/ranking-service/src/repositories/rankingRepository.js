const { Ranking } = require('../models/Ranking');

function createRankingRepository() {
  async function findByUserId(userId) {
    return Ranking.findOne({ userId }).lean();
  }

  async function findAll({ limit = 50, page = 1, sort = 'bestScore' } = {}) {
    const parsedLimit = Math.min(Math.max(Number(limit) || 50, 1), 100);
    const parsedPage = Math.max(Number(page) || 1, 1);
    const sortField = ['bestScore', 'victories', 'totalRuns', 'lastRunAt'].includes(sort)
      ? sort
      : 'bestScore';

    return Ranking.find()
      .sort({ [sortField]: -1 })
      .skip((parsedPage - 1) * parsedLimit)
      .limit(parsedLimit)
      .lean();
  }

  async function upsertResult({ userId, userName, isVictory, score }) {
    const now = new Date();

    const update = {
      $inc: {
        totalRuns: 1,
        victories: isVictory ? 1 : 0,
        defeats: isVictory ? 0 : 1,
        bossKills: isVictory ? 1 : 0
      },
      $set: {
        userName,
        lastRunAt: now
      },
      $max: {
        bestScore: score
      }
    };

    return Ranking.findOneAndUpdate(
      { userId },
      update,
      { upsert: true, new: true }
    ).lean();
  }

  return { findByUserId, findAll, upsertResult };
}

module.exports = { createRankingRepository };
