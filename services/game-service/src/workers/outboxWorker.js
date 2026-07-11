const express = require('express');
const mongoose = require('mongoose');
const os = require('os');

const { loadConfig } = require('../config/env');
const { connectToDatabase, disconnectFromDatabase } = require('../config/database');
const { OutboxEvent } = require('../models/OutboxEvent');
const { createOutboxRepository } = require('../repositories/outboxRepository');
const { createRankingClient } = require('../services/rankingClient');
const { createOutboxProcessor } = require('../services/outboxProcessor');
const { createOutboxMetrics } = require('../utils/outboxMetrics');

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const config = loadConfig();
  await connectToDatabase(config.mongoUri);
  await OutboxEvent.init();

  const metrics = createOutboxMetrics();
  const workerId = `${os.hostname()}-${process.pid}`;
  let running = true;
  let lastLoopAt = Date.now();
  const outboxRepository = createOutboxRepository();
  const rankingClient = createRankingClient({
    baseUrl: config.rankingServiceUrl,
    internalServiceSecret: config.internalServiceSecret,
    timeoutMs: config.outboxHttpTimeoutMs
  });
  const processor = createOutboxProcessor({
    outboxRepository,
    rankingClient,
    metrics,
    workerId,
    batchSize: config.outboxBatchSize,
    maxAttempts: config.outboxMaxAttempts,
    baseDelayMs: config.outboxBaseDelayMs,
    maxDelayMs: config.outboxMaxDelayMs,
    lockTimeoutMs: config.outboxLockTimeoutMs,
    onProgress: () => {
      lastLoopAt = Date.now();
    }
  });

  const app = express();

  app.get('/live', (_req, res) => res.json({ service: 'game-outbox-worker', status: 'ok' }));
  app.get('/health', (_req, res) => {
    const healthyLoopWindowMs = Math.max(
      config.outboxHttpTimeoutMs + config.outboxPollIntervalMs * 3 + 1000,
      5000
    );
    const loopIsActive = Date.now() - lastLoopAt <= healthyLoopWindowMs;
    const databaseIsReady = mongoose.connection.readyState === 1;
    const status = loopIsActive && databaseIsReady ? 200 : 503;
    return res.status(status).json({
      service: 'game-outbox-worker',
      status: status === 200 ? 'ok' : 'unavailable',
      database: databaseIsReady ? 'ok' : 'unavailable',
      loop: loopIsActive ? 'ok' : 'stalled'
    });
  });
  app.get('/metrics', async (_req, res) => {
    res.set('Content-Type', metrics.register.contentType);
    res.end(await metrics.register.metrics());
  });

  const server = app.listen(config.outboxMetricsPort, '0.0.0.0', () => {
    console.log(`[game-outbox-worker] Métricas e health na porta ${config.outboxMetricsPort}`);
  });

  async function shutdown() {
    running = false;
    server.close();
  }
  process.once('SIGTERM', shutdown);
  process.once('SIGINT', shutdown);

  while (running) {
    try {
      await processor.processCycle();
    } catch (error) {
      console.error('[game-outbox-worker] Falha no ciclo:', sanitizeWorkerError(error));
    } finally {
      lastLoopAt = Date.now();
    }

    if (running) await wait(config.outboxPollIntervalMs);
  }

  await disconnectFromDatabase();
}

function sanitizeWorkerError(error) {
  return String(error?.message || 'erro desconhecido')
    .replace(/[\u0000-\u001f\u007f]+/g, ' ')
    .slice(0, 500);
}

main().catch((error) => {
  console.error('[game-outbox-worker] Falha ao iniciar:', sanitizeWorkerError(error));
  process.exit(1);
});
