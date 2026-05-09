const express = require('express');

const { asyncHandler } = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/responses');
const { validate } = require('../middlewares/validate');
const { registerSchema, loginSchema } = require('../validators/authValidators');

function createAuthRoutes({ authService }) {
  const router = express.Router();

  router.post(
    '/register',
    validate(registerSchema),
    asyncHandler(async (req, res) => {
      const user = await authService.register(req.body);
      return sendSuccess(res, 201, user);
    })
  );

  router.post(
    '/login',
    validate(loginSchema),
    asyncHandler(async (req, res) => {
      const result = await authService.login(req.body);
      return sendSuccess(res, 200, result);
    })
  );

  return router;
}

module.exports = { createAuthRoutes };
