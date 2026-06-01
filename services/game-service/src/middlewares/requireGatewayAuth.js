const { AppError } = require('../errors/AppError');

function requireGatewayAuth(req, _res, next) {
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
}

function requireRole(role) {
  return (req, _res, next) => {
    if (!req.user || req.user.role !== role) {
      return next(new AppError(403, 'FORBIDDEN', 'Usuário sem permissão.'));
    }

    return next();
  };
}

module.exports = { requireGatewayAuth, requireRole };
