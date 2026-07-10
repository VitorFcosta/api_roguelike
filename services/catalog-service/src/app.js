const express = require('express');
const helmet = require('helmet');
const mongoose = require('mongoose');

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
const { sendSuccess, sendError } = require('./utils/responses');
const { createMetrics } = require('./utils/metrics');

function createApp(options = {}) {
  const config = options.config || loadConfig();
  const isDatabaseReady = options.isDatabaseReady || (() => mongoose.connection.readyState === 1);

  const cardRepository = options.cardRepository || createCardRepository();
  const enemyRepository = options.enemyRepository || createEnemyRepository();
  const bossRepository = options.bossRepository || createBossRepository();

  const cardService = createCardService({ cardRepository });
  const enemyService = createEnemyService({ enemyRepository });
  const bossService = createBossService({ bossRepository });

  const { metricsMiddleware, metricsEndpoint } = createMetrics('catalog_service');
  const app = express();

  app.disable('x-powered-by');
  app.use(helmet());
  app.use(express.json({ limit: '100kb' }));
  app.use(metricsMiddleware);

  app.get('/live', (_req, res) => {
    return sendSuccess(res, 200, {
      service: 'catalog-service',
      status: 'ok',
      timestamp: new Date().toISOString()
    });
  });

  app.get('/health', (_req, res) => {
    if (!isDatabaseReady()) {
      return sendError(res, 503, 'DATABASE_NOT_READY', 'Banco de dados indisponível.');
    }

    return sendSuccess(res, 200, {
      service: 'catalog-service',
      status: 'ok',
      timestamp: new Date().toISOString()
    });
  });

  app.get('/metrics', metricsEndpoint);

  app.use('/cards', createCardRoutes({ cardService, config }));
  app.use('/enemies', createEnemyRoutes({ enemyService, config }));
  app.use('/bosses', createBossRoutes({ bossService, config }));

  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
