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
    rankingServiceUrl: process.env.RANKING_SERVICE_URL || 'http://ranking-service:3004',
    internalServiceSecret: required('INTERNAL_SERVICE_SECRET'),
    outboxPollIntervalMs: numberFromEnv('OUTBOX_POLL_INTERVAL_MS', 1000),
    outboxBatchSize: numberFromEnv('OUTBOX_BATCH_SIZE', 20),
    outboxMaxAttempts: numberFromEnv('OUTBOX_MAX_ATTEMPTS', 10),
    outboxBaseDelayMs: numberFromEnv('OUTBOX_BASE_DELAY_MS', 1000),
    outboxMaxDelayMs: numberFromEnv('OUTBOX_MAX_DELAY_MS', 60000),
    outboxLockTimeoutMs: numberFromEnv('OUTBOX_LOCK_TIMEOUT_MS', 30000),
    outboxHttpTimeoutMs: numberFromEnv('OUTBOX_HTTP_TIMEOUT_MS', 5000),
    outboxMetricsPort: numberFromEnv('OUTBOX_METRICS_PORT', 3005)
  };
}

module.exports = { loadConfig };
