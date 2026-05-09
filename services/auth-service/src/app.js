const express = require('express');

const { loadConfig } = require('./config/env');
const { createUserRepository } = require('./repositories/userRepository');
const { createAuthService } = require('./services/authService');
const { createAuthRoutes } = require('./routes/authRoutes');
const { createUserRoutes } = require('./routes/userRoutes');
const { errorHandler } = require('./middlewares/errorHandler');
const { sendSuccess } = require('./utils/responses');

function createApp(options = {}) {
  const config = options.config || loadConfig();
  const userRepository = options.userRepository || createUserRepository();
  const authService = createAuthService({ userRepository, config });
  const app = express();

  app.use(express.json());

  app.get('/health', (_req, res) => {
    return sendSuccess(res, 200, {
      service: 'auth-service',
      status: 'ok',
      timestamp: new Date().toISOString()
    });
  });

  app.use('/auth', createAuthRoutes({ authService }));
  app.use('/users', createUserRoutes({ userRepository }));
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
