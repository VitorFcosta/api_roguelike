const { Ranking } = require('../models/Ranking');

function createRankingRepository() {
  async function findByUserId(userId) {
    return Ranking.findOne({ userId }).lean();
  }

  async function findAll() {
    return Ranking.find().sort({ bestScore: -1 }).limit(50).lean();
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
