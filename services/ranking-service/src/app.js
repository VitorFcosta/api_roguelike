const express = require('express');
const helmet = require('helmet');
const { loadConfig } = require('./config/env');
const { errorHandler } = require('./middlewares/errorHandler');
const { createRankingRepository } = require('./repositories/rankingRepository');
const { createRankingService } = require('./services/rankingService');
const { createRankingRoutes } = require('./routes/rankingRoutes');
const { sendSuccess } = require('./utils/responses');
const { createMetrics } = require('./utils/metrics');

function createApp(options = {}) {
  const config = options.config || loadConfig();
  const rankingRepository = options.rankingRepository || createRankingRepository();
  const rankingService = createRankingService({ rankingRepository });
  const { metricsMiddleware, metricsEndpoint } = createMetrics('ranking_service');

  const app = express();
  app.disable('x-powered-by');
  app.use(helmet());
  app.use(express.json({ limit: '100kb' }));
  app.use(metricsMiddleware);

  app.get('/health', (_req, res) => {
    return sendSuccess(res, 200, {
      service: 'ranking-service',
      status: 'ok',
      timestamp: new Date().toISOString()
    });
  });

  app.get('/metrics', metricsEndpoint);

  app.use('/', createRankingRoutes({ rankingService, config }));
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
