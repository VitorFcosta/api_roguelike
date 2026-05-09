const { AppError } = require('../errors/AppError');

function requireRole(role) {
  return (req, _res, next) => {
    if (!req.user || req.user.role !== role) {
      return next(new AppError(403, 'FORBIDDEN', 'Usuário sem permissão.'));
    }

    return next();
  };
}

function requireCatalogPermission(req, res, next) {
  if (req.method === 'GET') {
    return next();
  }

  return requireRole('admin')(req, res, next);
}

module.exports = { requireRole, requireCatalogPermission };
