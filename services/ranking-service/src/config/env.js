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
    port: numberFromEnv('RANKING_SERVICE_PORT', numberFromEnv('PORT', 3004)),
    mongoUri: required('MONGO_URI')
  };
}

module.exports = { loadConfig };
