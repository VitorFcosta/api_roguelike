const express = require('express');

const { asyncHandler } = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/responses');
const { validate } = require('../middlewares/validate');
const { validateObjectId } = require('../middlewares/validateObjectId');
const { requireGatewayAuth, requireRole } = require('../middlewares/requireGatewayAuth');
const { createBossSchema, updateBossSchema } = require('../validators/bossValidators');

function createBossRoutes({ bossService }) {
  const router = express.Router();

  router.get(
    '/random',
    asyncHandler(async (_req, res) => {
      const boss = await bossService.findRandom();
      return sendSuccess(res, 200, boss);
    })
  );

  router.get(
    '/',
    asyncHandler(async (_req, res) => {
      const bosses = await bossService.listActive();
      return sendSuccess(res, 200, bosses);
    })
  );

  router.get(
    '/:id',
    validateObjectId,
    asyncHandler(async (req, res) => {
      const boss = await bossService.findById(req.params.id);
      return sendSuccess(res, 200, boss);
    })
  );

  router.post(
    '/',
    requireGatewayAuth,
    requireRole('admin'),
    validate(createBossSchema),
    asyncHandler(async (req, res) => {
      const boss = await bossService.create(req.body);
      return sendSuccess(res, 201, boss);
    })
  );

  router.put(
    '/:id',
    requireGatewayAuth,
    requireRole('admin'),
    validateObjectId,
    validate(updateBossSchema),
    asyncHandler(async (req, res) => {
      const boss = await bossService.update(req.params.id, req.body);
      return sendSuccess(res, 200, boss);
    })
  );

  router.delete(
    '/:id',
    requireGatewayAuth,
    requireRole('admin'),
    validateObjectId,
    asyncHandler(async (req, res) => {
      const boss = await bossService.softDelete(req.params.id);
      return sendSuccess(res, 200, boss);
    })
  );

  return router;
}

module.exports = { createBossRoutes };
