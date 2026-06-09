const express = require('express');
const helmet = require('helmet');

const { loadConfig } = require('./config/env');
const { createUserRepository } = require('./repositories/userRepository');
const { createAuthService } = require('./services/authService');
const { createAuthRoutes } = require('./routes/authRoutes');
const { createUserRoutes } = require('./routes/userRoutes');
const { errorHandler } = require('./middlewares/errorHandler');
const { sendSuccess } = require('./utils/responses');
const { createMetrics } = require('./utils/metrics');

function createApp(options = {}) {
  const config = options.config || loadConfig();
  const userRepository = options.userRepository || createUserRepository();
  const authService = createAuthService({ userRepository, config });
  const { metricsMiddleware, metricsEndpoint } = createMetrics('auth_service');
  const app = express();

  app.disable('x-powered-by');
  app.use(helmet());
  app.use(express.json({ limit: '100kb' }));
  app.use(metricsMiddleware);

  app.get('/health', (_req, res) => {
    return sendSuccess(res, 200, {
      service: 'auth-service',
      status: 'ok',
      timestamp: new Date().toISOString()
    });
  });

  app.get('/metrics', metricsEndpoint);

  app.use('/auth', createAuthRoutes({ authService }));
  app.use('/users', createUserRoutes({ userRepository, config }));
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
