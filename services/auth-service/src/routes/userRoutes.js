const express = require('express');

const { AppError } = require('../errors/AppError');
const { requireGatewayAuth, requireRole } = require('../middlewares/requireGatewayAuth');
const { asyncHandler } = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/responses');
const { toSafeUser } = require('../utils/userPresenter');

function createUserRoutes({ userRepository, config }) {
  const router = express.Router();
  const gatewayAuth = requireGatewayAuth(config);

  router.get(
    '/me',
    gatewayAuth,
    asyncHandler(async (req, res) => {
      const user = await userRepository.findById(req.user.id);

      if (!user) {
        throw new AppError(404, 'USER_NOT_FOUND', 'Usuário não encontrado.');
      }

      return sendSuccess(res, 200, toSafeUser(user));
    })
  );

  router.get(
    '/',
    gatewayAuth,
    requireRole('admin'),
    asyncHandler(async (_req, res) => {
      const users = await userRepository.listActive();
      return sendSuccess(res, 200, users.map(toSafeUser));
    })
  );

  return router;
}

module.exports = { createUserRoutes };
