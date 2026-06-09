const crypto = require('crypto');

const { AppError } = require('../errors/AppError');

function hasValidInternalSecret(req, config = {}) {
  const expectedSecret = config.internalServiceSecret;
  const providedSecret = req.get('X-Internal-Service-Secret');

  if (!expectedSecret || !providedSecret) {
    return false;
  }

  const expected = Buffer.from(expectedSecret);
  const provided = Buffer.from(providedSecret);

  return expected.length === provided.length && crypto.timingSafeEqual(expected, provided);
}

function requireInternalService(config) {
  return (req, _res, next) => {
    if (!hasValidInternalSecret(req, config)) {
      return next(new AppError(401, 'INTERNAL_AUTH_REQUIRED', 'Autenticação interna obrigatória.'));
    }

    return next();
  };
}

function requireGatewayAuth(config) {
  return (req, _res, next) => {
    if (!hasValidInternalSecret(req, config)) {
      return next(new AppError(401, 'INTERNAL_AUTH_REQUIRED', 'Autenticação interna obrigatória.'));
    }

    const userId = req.get('X-User-Id');
    const userRole = req.get('X-User-Role');

    if (!userId || !userRole) {
      return next(new AppError(401, 'AUTH_REQUIRED', 'Autenticação obrigatória.'));
    }

    req.user = {
      id: userId,
      role: userRole
    };

    return next();
  };
}

function requireRole(role) {
  return (req, _res, next) => {
    if (!req.user || req.user.role !== role) {
      return next(new AppError(403, 'FORBIDDEN', 'Usuário sem permissão.'));
    }

    return next();
  };
}

module.exports = { requireGatewayAuth, requireInternalService, requireRole };
