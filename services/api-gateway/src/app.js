const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const swaggerUi = require('swagger-ui-express');

const { loadConfig } = require('./config/env');
const { AppError } = require('./errors/AppError');
const { authenticateJwt } = require('./middlewares/authenticateJwt');
const { errorHandler } = require('./middlewares/errorHandler');
const { requestId } = require('./middlewares/requestId');
const { requireRole, requireCatalogPermission } = require('./middlewares/requireRole');
const { forwardHttpRequest } = require('./upstreams/forwardHttpRequest');
const { buildForwardHeaders } = require('./upstreams/buildForwardHeaders');
const { sendError, sendSuccess } = require('./utils/responses');
const { createMetrics } = require('./utils/metrics');
const { swaggerDocument } = require('./swagger');

function createForwardHandler({ baseUrl, forwarder, config }) {
  return async (req, res, next) => {
    try {
      const result = await forwarder({
        baseUrl,
        path: req.originalUrl.replace(/^\/v1/, ''),
        method: req.method,
        headers: buildForwardHeaders(req, config),
        body: req.body,
        requestId: req.requestId
      });

      if (result.headers && result.headers['content-type']) {
        res.type(result.headers['content-type']);
      }

      return res.status(result.status).send(result.body);
    } catch (error) {
      return next(error);
    }
  };
}

function createApp(options = {}) {
  const config = options.config || loadConfig();
  const forwarder = options.forwarder || forwardHttpRequest;
  const app = express();
  const auth = authenticateJwt(config);

  const forwardToAuth    = createForwardHandler({ baseUrl: config.authServiceUrl,    forwarder, config });
  const forwardToCatalog = createForwardHandler({ baseUrl: config.catalogServiceUrl, forwarder, config });
  const forwardToGame    = createForwardHandler({ baseUrl: config.gameServiceUrl,    forwarder, config });
  const forwardToRanking = createForwardHandler({ baseUrl: config.rankingServiceUrl, forwarder, config });

  const { metricsMiddleware, metricsEndpoint } = createMetrics('api_gateway');

  app.disable('x-powered-by');
  app.use(requestId);
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(cors({ origin: config.corsOrigin }));
  app.use(express.json({ limit: '100kb' }));
  app.use(metricsMiddleware);

  if (config.rateLimitEnabled !== false) {
    app.use(rateLimit({
      windowMs: config.rateLimitWindowMs,
      limit: config.rateLimitMax,
      standardHeaders: true,
      legacyHeaders: false,
      handler: (_req, res) => sendError(res, 429, 'RATE_LIMIT_EXCEEDED', 'Muitas requisições. Tente novamente mais tarde.')
    }));
  }

  // ─── SWAGGER ───────────────────────────────────────────────────────────────
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, {
    customSiteTitle: 'API Roguelike de Cartas',
    swaggerOptions: {
      persistAuthorization: true
    }
  }));

  // ─── INFRA ─────────────────────────────────────────────────────────────────
  app.get('/metrics', metricsEndpoint);

  app.get('/health', (_req, res) => {
    return sendSuccess(res, 200, {
      service: 'api-gateway',
      status: 'ok',
      timestamp: new Date().toISOString()
    });
  });

  // ─── AUTH ──────────────────────────────────────────────────────────────────
  app.post('/v1/auth/register', forwardToAuth);
  app.post('/v1/auth/login', forwardToAuth);
  app.get('/v1/users/me', auth, forwardToAuth);
  app.get('/v1/users', auth, requireRole('admin'), forwardToAuth);

  // ─── CATALOG ───────────────────────────────────────────────────────────────
  app.get('/v1/cards/starter', forwardToCatalog);
  app.get('/v1/enemies/random', forwardToCatalog);
  app.get('/v1/bosses/random', forwardToCatalog);

  app.use('/v1/cards',   auth, requireCatalogPermission, forwardToCatalog);
  app.use('/v1/enemies', auth, requireCatalogPermission, forwardToCatalog);
  app.use('/v1/bosses',  auth, requireCatalogPermission, forwardToCatalog);

  // ─── GAME ──────────────────────────────────────────────────────────────────
  app.use('/v1/runs',    auth, forwardToGame);
  app.use('/v1/battles', auth, forwardToGame);
  app.use('/v1/rewards', auth, forwardToGame);

  // ─── RANKING ───────────────────────────────────────────────────────────────
  app.get('/v1/ranking', auth, forwardToRanking);
  app.get('/v1/ranking/me', auth, forwardToRanking);

  // ─── 404 ───────────────────────────────────────────────────────────────────
  app.use((_req, _res, next) => {
    next(new AppError(404, 'NOT_FOUND', 'Rota não encontrada.'));
  });

  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
