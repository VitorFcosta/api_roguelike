const bcrypt = require('bcrypt');

const { loadConfig } = require('../src/config/env');
const { connectToDatabase, disconnectFromDatabase } = require('../src/config/database');
const { createUserRepository } = require('../src/repositories/userRepository');

async function seedAdmin() {
  const config = loadConfig();

  if (!config.adminSeedEmail || !config.adminSeedPassword) {
    throw new Error('ADMIN_SEED_EMAIL e ADMIN_SEED_PASSWORD são obrigatórios para criar o admin.');
  }

  await connectToDatabase(config.mongoUri);

  const userRepository = createUserRepository();
  const passwordHash = await bcrypt.hash(config.adminSeedPassword, config.bcryptSaltRounds);
  const admin = await userRepository.upsertAdmin({
    name: config.adminSeedName,
    email: config.adminSeedEmail,
    passwordHash
  });

  console.log(`Admin pronto: ${admin.email}`);
}

seedAdmin()
  .catch((error) => {
    console.error('Falha ao criar admin:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectFromDatabase();
  });
