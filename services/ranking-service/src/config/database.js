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

module.exports = { connectToDatabase, disconnectFromDatabase };
