const express = require('express');
const { asyncHandler } = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/responses');
const { requireGatewayAuth } = require('../middlewares/requireGatewayAuth');
const { validateObjectId } = require('../middlewares/validateObjectId');

function createRunRoutes({ gameService }) {
  const router = express.Router();

  // POST /runs — cria nova run
  router.post(
    '/',
    requireGatewayAuth,
    asyncHandler(async (req, res) => {
      const run = await gameService.createRun(req.user.id);
      return sendSuccess(res, 201, run);
    })
  );

  // GET /runs — histórico de runs do usuário
  router.get(
    '/',
    requireGatewayAuth,
    asyncHandler(async (req, res) => {
      const runs = await gameService.listRuns(req.user.id);
      return sendSuccess(res, 200, runs);
    })
  );

  // GET /runs/:id — detalhes de uma run
  router.get(
    '/:id',
    requireGatewayAuth,
    validateObjectId,
    asyncHandler(async (req, res) => {
      const run = await gameService.getRunById(req.params.id, req.user.id);
      return sendSuccess(res, 200, run);
    })
  );

  // POST /runs/:id/battles — inicia batalha na run
  router.post(
    '/:id/battles',
    requireGatewayAuth,
    validateObjectId,
    asyncHandler(async (req, res) => {
      const battle = await gameService.createBattle(req.params.id, req.user.id);
      return sendSuccess(res, 201, battle);
    })
  );

  // GET /runs/:id/rewards — recompensa pendente da run
  router.get(
    '/:id/rewards',
    requireGatewayAuth,
    validateObjectId,
    asyncHandler(async (req, res) => {
      const reward = await gameService.getRewards(req.params.id, req.user.id);
      return sendSuccess(res, 200, reward);
    })
  );

  // POST /runs/:id/abandon — abandona a run
  router.post(
    '/:id/abandon',
    requireGatewayAuth,
    validateObjectId,
    asyncHandler(async (req, res) => {
      const run = await gameService.abandonRun(req.params.id, req.user.id);
      return sendSuccess(res, 200, run);
    })
  );

  return router;
}

module.exports = { createRunRoutes };
