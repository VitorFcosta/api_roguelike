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
    port: numberFromEnv('GAME_SERVICE_PORT', numberFromEnv('PORT', 3003)),
    mongoUri: required('MONGO_URI'),
    catalogServiceUrl: process.env.CATALOG_SERVICE_URL || 'http://catalog-service:3002',
    rankingServiceUrl: process.env.RANKING_SERVICE_URL || 'http://ranking-service:3004'
  };
}

module.exports = { loadConfig };
