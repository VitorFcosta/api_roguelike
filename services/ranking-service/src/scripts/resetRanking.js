const { loadConfig } = require('../config/env');
const { connectToDatabase, disconnectFromDatabase, runInTransaction } = require('../config/database');
const { createRankingRepository } = require('../repositories/rankingRepository');
const { createProcessedRunRepository } = require('../repositories/processedRunRepository');

async function main() {
  if (process.env.CONFIRM_RANKING_RESET !== 'true') {
    throw new Error('Reset cancelado. Defina CONFIRM_RANKING_RESET=true para confirmar.');
  }

  const config = loadConfig();
  await connectToDatabase(config.mongoUri);

  const rankingRepository = createRankingRepository();
  const processedRunRepository = createProcessedRunRepository();

  await runInTransaction(async (session) => {
    await rankingRepository.deleteAll({ session });
    await processedRunRepository.deleteAll({ session });
  });

  console.log('[ranking-reset] Ranking e runs processadas foram apagados.');
}

main()
  .catch((error) => {
    console.error('[ranking-reset] Falha:', error.message);
    process.exitCode = 1;
  })
  .finally(disconnectFromDatabase);
