require('dotenv').config();

function required(name) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Variável de ambiente obrigatória ausente: ${name}`);
  }

  return value;
}

function numberFromEnv(name, fallback) {
  const rawValue = process.env[name];

  if (!rawValue) {
    return fallback;
  }

  const value = Number(rawValue);

  if (Number.isNaN(value)) {
    throw new Error(`Variável de ambiente inválida: ${name}`);
  }

  return value;
}

function loadConfig() {
  return {
    port: numberFromEnv('GATEWAY_PORT', numberFromEnv('PORT', 3000)),
    authServiceUrl: required('AUTH_SERVICE_URL'),
    catalogServiceUrl: process.env.CATALOG_SERVICE_URL || 'http://catalog-service:3002',
    gameServiceUrl: process.env.GAME_SERVICE_URL || 'http://game-service:3003',
    rankingServiceUrl: process.env.RANKING_SERVICE_URL || 'http://ranking-service:3004',
    jwtSecret: required('JWT_SECRET'),
    jwtIssuer: process.env.JWT_ISSUER || 'roguelike-api',
    jwtAudience: process.env.JWT_AUDIENCE || 'roguelike-client',
    internalServiceSecret: required('INTERNAL_SERVICE_SECRET'),
    corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    rateLimitWindowMs: numberFromEnv('RATE_LIMIT_WINDOW_MS', 60000),
    rateLimitMax: numberFromEnv('RATE_LIMIT_MAX', 100),
    upstreamTimeoutMs: numberFromEnv('UPSTREAM_TIMEOUT_MS', 5000),
    rateLimitEnabled: process.env.RATE_LIMIT_ENABLED !== 'false'
  };
}

module.exports = { loadConfig };
