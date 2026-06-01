const express = require('express');

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
const { sendSuccess } = require('./utils/responses');

function createApp(options = {}) {
  const hasInjectedDeps =
    options.runRepository && options.battleRepository && options.rewardRepository;

  const config = options.config || (hasInjectedDeps ? {} : loadConfig());

  const runRepository = options.runRepository || createRunRepository();
  const battleRepository = options.battleRepository || createBattleRepository();
  const rewardRepository = options.rewardRepository || createRewardRepository();

  const catalogClient =
    options.catalogClient || createCatalogClient(config.catalogServiceUrl);
  const rankingClient =
    options.rankingClient || createRankingClient(config.rankingServiceUrl);

  const gameService = createGameService({
    runRepository,
    battleRepository,
    rewardRepository,
    catalogClient,
    rankingClient
  });

  const app = express();
  app.use(express.json());

  app.get('/health', (_req, res) => {
    return sendSuccess(res, 200, {
      service: 'game-service',
      status: 'ok',
      timestamp: new Date().toISOString()
    });
  });

  app.use('/runs', createRunRoutes({ gameService }));
  app.use('/battles', createBattleRoutes({ gameService }));
  app.use('/rewards', createRewardRoutes({ gameService }));

  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
