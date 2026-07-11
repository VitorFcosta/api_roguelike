const mongoose = require('mongoose');

function wait(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function connectToDatabase(mongoUri, options = {}) {
  const attempts = options.attempts || 10;
  const delayMs = options.delayMs || 2000;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      await mongoose.connect(mongoUri);
      return;
    } catch (error) {
      if (attempt === attempts) {
        throw error;
      }

      await wait(delayMs);
    }
  }
}

async function disconnectFromDatabase() {
  await mongoose.disconnect();
}

async function runInTransaction(work) {
  let result;

  await mongoose.connection.transaction(
    async (session) => {
      result = await work(session);
    },
    {
      readPreference: 'primary',
      readConcern: { level: 'snapshot' },
      writeConcern: { w: 'majority' }
    }
  );

  return result;
}

module.exports = { connectToDatabase, disconnectFromDatabase, runInTransaction };
