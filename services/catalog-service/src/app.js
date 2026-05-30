const express = require('express');

const { loadConfig } = require('./config/env');
const { createCardRepository } = require('./repositories/cardRepository');
const { createEnemyRepository } = require('./repositories/enemyRepository');
const { createBossRepository } = require('./repositories/bossRepository');
const { createCardService } = require('./services/cardService');
const { createEnemyService } = require('./services/enemyService');
const { createBossService } = require('./services/bossService');
const { createCardRoutes } = require('./routes/cardRoutes');
const { createEnemyRoutes } = require('./routes/enemyRoutes');
const { createBossRoutes } = require('./routes/bossRoutes');
const { errorHandler } = require('./middlewares/errorHandler');
const { sendSuccess } = require('./utils/responses');

function createApp(options = {}) {
  const hasInjectedRepositories =
    options.cardRepository && options.enemyRepository && options.bossRepository;

  const config = options.config || (hasInjectedRepositories ? {} : loadConfig());

  const cardRepository = options.cardRepository || createCardRepository();
  const enemyRepository = options.enemyRepository || createEnemyRepository();
  const bossRepository = options.bossRepository || createBossRepository();

  const cardService = createCardService({ cardRepository });
  const enemyService = createEnemyService({ enemyRepository });
  const bossService = createBossService({ bossRepository });

  const app = express();

  app.use(express.json());

  app.get('/health', (_req, res) => {
    return sendSuccess(res, 200, {
      service: 'catalog-service',
      status: 'ok',
      timestamp: new Date().toISOString()
    });
  });

  app.use('/cards', createCardRoutes({ cardService }));
  app.use('/enemies', createEnemyRoutes({ enemyService }));
  app.use('/bosses', createBossRoutes({ bossService }));

  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
