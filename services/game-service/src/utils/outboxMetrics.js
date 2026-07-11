const client = require('prom-client');

function createOutboxMetrics() {
  const register = new client.Registry();
  client.collectDefaultMetrics({ register, prefix: 'game_outbox_worker_' });

  const published = new client.Counter({
    name: 'game_outbox_worker_published_total',
    help: 'Total de eventos publicados com sucesso',
    registers: [register]
  });
  const failures = new client.Counter({
    name: 'game_outbox_worker_failures_total',
    help: 'Total de falhas ao publicar eventos',
    registers: [register]
  });
  const deadLetters = new client.Counter({
    name: 'game_outbox_worker_dead_letters_total',
    help: 'Total de eventos enviados para dead-letter',
    registers: [register]
  });
  const pending = new client.Gauge({
    name: 'game_outbox_worker_pending_events',
    help: 'Quantidade atual de eventos pendentes',
    registers: [register]
  });
  const processingDuration = new client.Histogram({
    name: 'game_outbox_worker_processing_duration_seconds',
    help: 'Duração do processamento de um evento em segundos',
    buckets: [0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10],
    registers: [register]
  });

  return { register, published, failures, deadLetters, pending, processingDuration };
}

module.exports = { createOutboxMetrics };
