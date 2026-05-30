const { createApp } = require('./app');
const { loadConfig } = require('./config/env');
const { connectToDatabase } = require('./config/database');

async function start() {
  const config = loadConfig();
  await connectToDatabase(config.mongoUri);

  const app = createApp({ config });

  app.listen(config.port, () => {
    console.log(`catalog-service rodando na porta ${config.port}`);
  });
}

start().catch((error) => {
  console.error('Falha ao iniciar catalog-service:', error.message);
  process.exit(1);
});
