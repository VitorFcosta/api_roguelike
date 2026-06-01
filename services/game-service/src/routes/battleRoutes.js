const express = require('express');
const { asyncHandler } = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/responses');
const { requireGatewayAuth } = require('../middlewares/requireGatewayAuth');
const { validateObjectId } = require('../middlewares/validateObjectId');

function createBattleRoutes({ gameService }) {
  const router = express.Router();

  // GET /battles/:id — estado da batalha
  router.get(
    '/:id',
    requireGatewayAuth,
    validateObjectId,
    asyncHandler(async (req, res) => {
      const battle = await gameService.getBattleById(req.params.id);
      return sendSuccess(res, 200, battle);
    })
  );

  // POST /battles/:id/actions/play-card — usa uma carta na batalha
  router.post(
    '/:id/actions/play-card',
    requireGatewayAuth,
    validateObjectId,
    asyncHandler(async (req, res) => {
      const { cardId } = req.body;
      if (!cardId) {
        return res.status(400).json({
          success: false,
          error: { code: 'MISSING_CARD_ID', message: 'cardId é obrigatório.' }
        });
      }
      const battle = await gameService.playCard(req.params.id, cardId, req.user.id);
      return sendSuccess(res, 200, battle);
    })
  );

  return router;
}

module.exports = { createBattleRoutes };
