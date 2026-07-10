const express = require('express');
const helmet = require('helmet');
const mongoose = require('mongoose');

const { loadConfig } = require('./config/env');
const { createRunRepository } = require('./repositories/runRepository');
const { createBattleRepository } = require('./repositories/battleRepository');
const { createRewardRepository } = require('./repositories/rewardRepository');
const { createCatalogClient } = require('./services/catalogClient');
const { createRankingClient } = require('./services/rankingClient');
const { createGameService } = require('./services/gameService');
const { createRunRoutes } = require('./routes/runRoutes');
const { createBattleRoutes } = require('./routes/battleRoutes');
const { createRewardRoutes } = require('./routes/rewardRoutes');
const { errorHandler } = require('./middlewares/errorHandler');
const { sendSuccess, sendError } = require('./utils/responses');
const { createMetrics } = require('./utils/metrics');

function createApp(options = {}) {
  const config = options.config || loadConfig();
  const isDatabaseReady = options.isDatabaseReady || (() => mongoose.connection.readyState === 1);

  const runRepository = options.runRepository || createRunRepository();
  const battleRepository = options.battleRepository || createBattleRepository();
  const rewardRepository = options.rewardRepository || createRewardRepository();

  const catalogClient =
    options.catalogClient || createCatalogClient(config.catalogServiceUrl);
  const rankingClient =
    options.rankingClient || createRankingClient({
      baseUrl: config.rankingServiceUrl,
      internalServiceSecret: config.internalServiceSecret
    });

  const gameService = createGameService({
    runRepository,
    battleRepository,
    rewardRepository,
    catalogClient,
    rankingClient
  });

  const { metricsMiddleware, metricsEndpoint } = createMetrics('game_service');
  const app = express();
  app.disable('x-powered-by');
  app.use(helmet());
  app.use(express.json({ limit: '100kb' }));
  app.use(metricsMiddleware);

  app.get('/live', (_req, res) => {
    return sendSuccess(res, 200, {
      service: 'game-service',
      status: 'ok',
      timestamp: new Date().toISOString()
    });
  });

  app.get('/health', (_req, res) => {
    if (!isDatabaseReady()) {
      return sendError(res, 503, 'DATABASE_NOT_READY', 'Banco de dados indisponível.');
    }

    return sendSuccess(res, 200, {
      service: 'game-service',
      status: 'ok',
      timestamp: new Date().toISOString()
    });
  });

  app.get('/metrics', metricsEndpoint);

  app.use('/runs', createRunRoutes({ gameService, config }));
  app.use('/battles', createBattleRoutes({ gameService, config }));
  app.use('/rewards', createRewardRoutes({ gameService, config }));

  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
