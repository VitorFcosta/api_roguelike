const express = require('express');
const { asyncHandler } = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/responses');
const { requireGatewayAuth } = require('../middlewares/requireGatewayAuth');

function createRankingRoutes({ rankingService }) {
  const router = express.Router();

  // Rota interna chamada pelo game-service ao finalizar run
  // Não exige gateway auth pois é chamada internamente
  router.post('/rankings', asyncHandler(async (req, res) => {
    const { userId, userName, status, floor } = req.body;
    const result = await rankingService.registerRunResult({ userId, userName, status, floor });
    return sendSuccess(res, 200, result);
  }));

  // Ranking geral - requer autenticação via gateway
  router.get('/ranking', requireGatewayAuth, asyncHandler(async (_req, res) => {
    const ranking = await rankingService.getGlobalRanking();
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
