const { createApp } = require('./app');
const { loadConfig } = require('./config/env');
const { connectToDatabase } = require('./config/database');

async function main() {
  const config = loadConfig();
  await connectToDatabase(config.mongoUri);

  const app = createApp({ config });

  app.listen(config.port, () => {
    console.log(`[game-service] Rodando na porta ${config.port}`);
  });
}

main().catch((err) => {
  console.error('[game-service] Falha ao iniciar:', err);
  process.exit(1);
});
