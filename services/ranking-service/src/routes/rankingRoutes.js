const express = require('express');
const { asyncHandler } = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/responses');
const { requireGatewayAuth } = require('../middlewares/requireGatewayAuth');

function createRankingRoutes({ rankingService }) {
  const router = express.Router();

  async function registerRunResult(req, res) {
    const { userId, userName, status, result, floor, score, runId } = req.body;
    const parsedScore = typeof score === 'number' ? score : undefined;
    const resultData = await rankingService.registerRunResult({
      userId,
      userName,
      status,
      result,
      floor,
      score: parsedScore,
      runId
    });
    return sendSuccess(res, 200, resultData);
  }

  router.post('/ranking/events/run-finished', asyncHandler(registerRunResult));

  // Rota interna chamada pelo game-service ao finalizar run
  // Não exige gateway auth pois é chamada internamente
  router.post('/rankings', asyncHandler(registerRunResult));

  // Ranking geral - requer autenticação via gateway
  router.get('/ranking', requireGatewayAuth, asyncHandler(async (req, res) => {
    const ranking = await rankingService.getGlobalRanking(req.query);
    return sendSuccess(res, 200, ranking);
  }));

  // Estatísticas do próprio usuário - requer autenticação via gateway
  router.get('/ranking/me', requireGatewayAuth, asyncHandler(async (req, res) => {
    const stats = await rankingService.getUserStats(req.user.id);
    return sendSuccess(res, 200, stats);
  }));

  return router;
}

module.exports = { createRankingRoutes };
