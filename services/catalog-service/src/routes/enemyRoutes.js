const express = require('express');

const { asyncHandler } = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/responses');
const { validate } = require('../middlewares/validate');
const { validateObjectId } = require('../middlewares/validateObjectId');
const { requireGatewayAuth, requireRole } = require('../middlewares/requireGatewayAuth');
const { createEnemySchema, updateEnemySchema } = require('../validators/enemyValidators');

function createEnemyRoutes({ enemyService }) {
  const router = express.Router();

  router.get(
    '/random',
    asyncHandler(async (_req, res) => {
      const enemy = await enemyService.findRandom();
      return sendSuccess(res, 200, enemy);
    })
  );

  router.get(
    '/',
    asyncHandler(async (req, res) => {
      const enemies = await enemyService.listActive(req.query);
      return sendSuccess(res, 200, enemies);
    })
  );

  router.get(
    '/:id',
    validateObjectId,
    asyncHandler(async (req, res) => {
      const enemy = await enemyService.findById(req.params.id);
      return sendSuccess(res, 200, enemy);
    })
  );

  router.post(
    '/',
    requireGatewayAuth,
    requireRole('admin'),
    validate(createEnemySchema),
    asyncHandler(async (req, res) => {
      const enemy = await enemyService.create(req.body);
      return sendSuccess(res, 201, enemy);
    })
  );

  router.put(
    '/:id',
    requireGatewayAuth,
    requireRole('admin'),
    validateObjectId,
    validate(updateEnemySchema),
    asyncHandler(async (req, res) => {
      const enemy = await enemyService.update(req.params.id, req.body);
      return sendSuccess(res, 200, enemy);
    })
  );

  router.delete(
    '/:id',
    requireGatewayAuth,
    requireRole('admin'),
    validateObjectId,
    asyncHandler(async (req, res) => {
      const enemy = await enemyService.softDelete(req.params.id);
      return sendSuccess(res, 200, enemy);
    })
  );

  return router;
}

module.exports = { createEnemyRoutes };
