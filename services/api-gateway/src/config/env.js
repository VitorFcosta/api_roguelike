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
    jwtSecret: required('JWT_SECRET'),
    jwtIssuer: process.env.JWT_ISSUER || 'roguelike-api',
    jwtAudience: process.env.JWT_AUDIENCE || 'roguelike-client',
    corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    rateLimitWindowMs: numberFromEnv('RATE_LIMIT_WINDOW_MS', 60000),
    rateLimitMax: numberFromEnv('RATE_LIMIT_MAX', 100),
    rateLimitEnabled: process.env.RATE_LIMIT_ENABLED !== 'false'
  };
}

module.exports = { loadConfig };
