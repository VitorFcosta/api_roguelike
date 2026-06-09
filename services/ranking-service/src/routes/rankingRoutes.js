const express = require('express');
const { asyncHandler } = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/responses');
const { requireGatewayAuth, requireInternalService } = require('../middlewares/requireGatewayAuth');

function createRankingRoutes({ rankingService, config }) {
  const router = express.Router();
  const gatewayAuth = requireGatewayAuth(config);
  const internalServiceAuth = requireInternalService(config);

  async function registerRunResult(req, res) {
    const { userId, userName, status, result, floor, runId } = req.body;
    const resultData = await rankingService.registerRunResult({
      userId,
      userName,
      status,
      result,
      floor,
      runId
    });
    return sendSuccess(res, 200, resultData);
  }

  router.post('/ranking/events/run-finished', internalServiceAuth, asyncHandler(registerRunResult));

  // Rota interna chamada pelo game-service ao finalizar run
  // Não exige gateway auth pois é chamada internamente
  router.post('/rankings', internalServiceAuth, asyncHandler(registerRunResult));

  // Ranking geral - requer autenticação via gateway
  router.get('/ranking', gatewayAuth, asyncHandler(async (req, res) => {
    const ranking = await rankingService.getGlobalRanking(req.query);
    return sendSuccess(res, 200, ranking);
  }));

  // Estatísticas do próprio usuário - requer autenticação via gateway
  router.get('/ranking/me', gatewayAuth, asyncHandler(async (req, res) => {
    const stats = await rankingService.getUserStats(req.user.id);
    return sendSuccess(res, 200, stats);
  }));

  return router;
}

module.exports = { createRankingRoutes };
