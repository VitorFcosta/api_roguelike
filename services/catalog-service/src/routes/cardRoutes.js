const express = require('express');

const { asyncHandler } = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/responses');
const { validate } = require('../middlewares/validate');
const { validateObjectId } = require('../middlewares/validateObjectId');
const { requireGatewayAuth, requireRole } = require('../middlewares/requireGatewayAuth');
const { createCardSchema, updateCardSchema } = require('../validators/cardValidators');

function createCardRoutes({ cardService }) {
  const router = express.Router();

  router.get(
    '/starter',
    asyncHandler(async (_req, res) => {
      const cards = await cardService.findStarters();
      return sendSuccess(res, 200, cards);
    })
  );

  router.get(
    '/',
    asyncHandler(async (_req, res) => {
      const cards = await cardService.listActive();
      return sendSuccess(res, 200, cards);
    })
  );

  router.get(
    '/:id',
    validateObjectId,
    asyncHandler(async (req, res) => {
      const card = await cardService.findById(req.params.id);
      return sendSuccess(res, 200, card);
    })
  );

  router.post(
    '/',
    requireGatewayAuth,
    requireRole('admin'),
    validate(createCardSchema),
    asyncHandler(async (req, res) => {
      const card = await cardService.create(req.body);
      return sendSuccess(res, 201, card);
    })
  );

  router.put(
    '/:id',
    requireGatewayAuth,
    requireRole('admin'),
    validateObjectId,
    validate(updateCardSchema),
    asyncHandler(async (req, res) => {
      const card = await cardService.update(req.params.id, req.body);
      return sendSuccess(res, 200, card);
    })
  );

  router.delete(
    '/:id',
    requireGatewayAuth,
    requireRole('admin'),
    validateObjectId,
    asyncHandler(async (req, res) => {
      const card = await cardService.softDelete(req.params.id);
      return sendSuccess(res, 200, card);
    })
  );

  return router;
}

module.exports = { createCardRoutes };
