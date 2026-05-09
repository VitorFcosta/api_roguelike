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
    port: numberFromEnv('AUTH_SERVICE_PORT', numberFromEnv('PORT', 3001)),
    mongoUri: required('MONGO_URI'),
    jwtSecret: required('JWT_SECRET'),
    jwtIssuer: process.env.JWT_ISSUER || 'roguelike-api',
    jwtAudience: process.env.JWT_AUDIENCE || 'roguelike-client',
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1h',
    bcryptSaltRounds: numberFromEnv('BCRYPT_SALT_ROUNDS', 10),
    adminSeedName: process.env.ADMIN_SEED_NAME || 'Admin',
    adminSeedEmail: process.env.ADMIN_SEED_EMAIL,
    adminSeedPassword: process.env.ADMIN_SEED_PASSWORD
  };
}

module.exports = { loadConfig };
