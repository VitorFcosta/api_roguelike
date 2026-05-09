const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const { loadConfig } = require('./config/env');
const { AppError } = require('./errors/AppError');
const { authenticateJwt } = require('./middlewares/authenticateJwt');
const { errorHandler } = require('./middlewares/errorHandler');
const { requestId } = require('./middlewares/requestId');
const { requireRole, requireCatalogPermission } = require('./middlewares/requireRole');
const { forwardHttpRequest } = require('./upstreams/forwardHttpRequest');
const { buildForwardHeaders } = require('./upstreams/buildForwardHeaders');
const { sendError, sendSuccess } = require('./utils/responses');

function createUnavailableHandler(code, serviceName) {
  return (_req, res) => {
    return sendError(res, 503, code, `${serviceName} ainda não foi implementado.`);
  };
}

function createForwardHandler({ baseUrl, forwarder }) {
  return async (req, res, next) => {
    try {
      const result = await forwarder({
        baseUrl,
        path: req.originalUrl.replace(/^\/v1/, ''),
        method: req.method,
        headers: buildForwardHeaders(req),
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
  const forwardToAuth = createForwardHandler({
    baseUrl: config.authServiceUrl,
    forwarder
  });

  app.use(requestId);
  app.use(cors({ origin: config.corsOrigin }));
  app.use(express.json());

  if (config.rateLimitEnabled !== false) {
    app.use(rateLimit({
      windowMs: config.rateLimitWindowMs,
      limit: config.rateLimitMax,
      standardHeaders: true,
      legacyHeaders: false
    }));
  }

  app.get('/health', (_req, res) => {
    return sendSuccess(res, 200, {
      service: 'api-gateway',
      status: 'ok',
      timestamp: new Date().toISOString()
    });
  });

  app.post('/v1/auth/register', forwardToAuth);
  app.post('/v1/auth/login', forwardToAuth);
  app.get('/v1/users/me', auth, forwardToAuth);
  app.get('/v1/users', auth, requireRole('admin'), forwardToAuth);

  app.use(
    ['/v1/cards', '/v1/enemies', '/v1/bosses'],
    auth,
    requireCatalogPermission,
    createUnavailableHandler('CATALOG_SERVICE_UNAVAILABLE', 'catalog-service')
  );

  app.use(
    ['/v1/runs', '/v1/battles', '/v1/rewards'],
    auth,
    createUnavailableHandler('GAME_SERVICE_UNAVAILABLE', 'game-service')
  );

  app.use(
    '/v1/ranking',
    auth,
    createUnavailableHandler('RANKING_SERVICE_UNAVAILABLE', 'ranking-service')
  );

  app.use((_req, _res, next) => {
    next(new AppError(404, 'NOT_FOUND', 'Rota não encontrada.'));
  });

  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
