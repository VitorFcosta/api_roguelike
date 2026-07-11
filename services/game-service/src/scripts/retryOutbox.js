const mongoose = require('mongoose');

const { loadConfig } = require('../config/env');
const { connectToDatabase, disconnectFromDatabase } = require('../config/database');
const { createOutboxRepository } = require('../repositories/outboxRepository');

function parseArguments(argv) {
  const eventIdIndex = argv.indexOf('--event-id');
  const all = argv.includes('--all');
  const eventId = eventIdIndex >= 0 ? argv[eventIdIndex + 1] : null;

  if ((all && eventId) || (!all && !eventId)) {
    throw new Error('Use exatamente uma opção: --event-id <id> ou --all.');
  }
  if (eventId && !mongoose.isObjectIdOrHexString(eventId)) {
    throw new Error('event-id inválido.');
  }

  return { all, eventId };
}

async function main() {
  const args = parseArguments(process.argv.slice(2));
  const config = loadConfig();
  await connectToDatabase(config.mongoUri);

  const result = await createOutboxRepository().retryDeadLetters(args);
  console.log(`[outbox-retry] ${result.modifiedCount} evento(s) devolvido(s) para pending.`);
}

main()
  .catch((error) => {
    console.error('[outbox-retry] Falha:', error.message);
    process.exitCode = 1;
  })
  .finally(disconnectFromDatabase);
