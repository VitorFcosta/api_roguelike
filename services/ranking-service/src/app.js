const express = require('express');
const { errorHandler } = require('./middlewares/errorHandler');
const { createRankingRepository } = require('./repositories/rankingRepository');
const { createRankingService } = require('./services/rankingService');
const { createRankingRoutes } = require('./routes/rankingRoutes');
const { sendSuccess } = require('./utils/responses');
const { createMetrics } = require('./utils/metrics');

function createApp(options = {}) {
  const rankingRepository = options.rankingRepository || createRankingRepository();
  const rankingService = createRankingService({ rankingRepository });
  const { metricsMiddleware, metricsEndpoint } = createMetrics('ranking_service');

  const app = express();
  app.use(express.json());
  app.use(metricsMiddleware);

  app.get('/health', (_req, res) => {
    return sendSuccess(res, 200, {
      service: 'ranking-service',
      status: 'ok',
      timestamp: new Date().toISOString()
    });
  });

  app.get('/metrics', metricsEndpoint);

  app.use('/', createRankingRoutes({ rankingService }));
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
