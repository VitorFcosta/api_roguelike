const { createApp } = require('./app');
const { loadConfig } = require('./config/env');
const { connectToDatabase } = require('./config/database');
const { Run } = require('./models/Run');
const { Battle } = require('./models/Battle');
const { Reward } = require('./models/Reward');
const { OutboxEvent } = require('./models/OutboxEvent');

async function main() {
  const config = loadConfig();
  await connectToDatabase(config.mongoUri);
  await Promise.all([Run.init(), Battle.init(), Reward.init(), OutboxEvent.init()]);

  const app = createApp({ config });

  app.listen(config.port, () => {
    console.log(`[game-service] Rodando na porta ${config.port}`);
  });
}

main().catch((err) => {
  console.error('[game-service] Falha ao iniciar:', err);
  process.exit(1);
});
