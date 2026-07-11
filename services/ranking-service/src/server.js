const { createApp } = require('./app');
const { loadConfig } = require('./config/env');
const { connectToDatabase } = require('./config/database');
const { Ranking } = require('./models/Ranking');
const { ProcessedRun } = require('./models/ProcessedRun');

async function start() {
  const config = loadConfig();
  await connectToDatabase(config.mongoUri);
  await Promise.all([Ranking.init(), ProcessedRun.init()]);

  const app = createApp({ config });

  app.listen(config.port, () => {
    console.log(`ranking-service rodando na porta ${config.port}`);
  });
}

start().catch((error) => {
  console.error('Falha ao iniciar ranking-service:', error.message);
  process.exit(1);
});
