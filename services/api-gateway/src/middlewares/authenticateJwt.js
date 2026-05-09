const jwt = require('jsonwebtoken');

const { AppError } = require('../errors/AppError');

function authenticateJwt(config) {
  return (req, _res, next) => {
    const authorization = req.get('Authorization');

    if (!authorization || !authorization.startsWith('Bearer ')) {
      return next(new AppError(401, 'AUTH_REQUIRED', 'Autenticação obrigatória.'));
    }

    const token = authorization.replace('Bearer ', '').trim();

    try {
      const payload = jwt.verify(token, config.jwtSecret, {
        algorithms: ['HS256'],
        issuer: config.jwtIssuer,
        audience: config.jwtAudience
      });

      req.user = {
        id: payload.sub,
        role: payload.role
      };

      return next();
    } catch (_error) {
      return next(new AppError(401, 'INVALID_TOKEN', 'Token inválido ou expirado.'));
    }
  };
}

module.exports = { authenticateJwt };
