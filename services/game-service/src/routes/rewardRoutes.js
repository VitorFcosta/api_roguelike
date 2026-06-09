const express = require('express');
const { asyncHandler } = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/responses');
const { requireGatewayAuth } = require('../middlewares/requireGatewayAuth');
const { validateObjectId } = require('../middlewares/validateObjectId');

function createRewardRoutes({ gameService, config }) {
  const router = express.Router();
  const gatewayAuth = requireGatewayAuth(config);

  // POST /rewards/:id/choose — escolhe uma carta da recompensa
  router.post(
    '/:id/choose',
    gatewayAuth,
    validateObjectId,
    asyncHandler(async (req, res) => {
      const { cardId } = req.body;
      if (!cardId) {
        return res.status(400).json({
          success: false,
          error: { code: 'MISSING_CARD_ID', message: 'cardId é obrigatório.' }
        });
      }
      const reward = await gameService.chooseReward(req.params.id, cardId, req.user.id);
      return sendSuccess(res, 200, reward);
    })
  );

  return router;
}

module.exports = { createRewardRoutes };
