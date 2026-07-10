const express = require('express');
const helmet = require('helmet');
const mongoose = require('mongoose');
const { loadConfig } = require('./config/env');
const { errorHandler } = require('./middlewares/errorHandler');
const { createRankingRepository } = require('./repositories/rankingRepository');
const { createRankingService } = require('./services/rankingService');
const { createRankingRoutes } = require('./routes/rankingRoutes');
const { sendSuccess, sendError } = require('./utils/responses');
const { createMetrics } = require('./utils/metrics');

function createApp(options = {}) {
  const config = options.config || loadConfig();
  const isDatabaseReady = options.isDatabaseReady || (() => mongoose.connection.readyState === 1);
  const rankingRepository = options.rankingRepository || createRankingRepository();
  const rankingService = createRankingService({ rankingRepository });
  const { metricsMiddleware, metricsEndpoint } = createMetrics('ranking_service');

  const app = express();
  app.disable('x-powered-by');
  app.use(helmet());
  app.use(express.json({ limit: '100kb' }));
  app.use(metricsMiddleware);

  app.get('/live', (_req, res) => {
    return sendSuccess(res, 200, {
      service: 'ranking-service',
      status: 'ok',
      timestamp: new Date().toISOString()
    });
  });

  app.get('/health', (_req, res) => {
    if (!isDatabaseReady()) {
      return sendError(res, 503, 'DATABASE_NOT_READY', 'Banco de dados indisponível.');
    }

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
