const { AppError } = require('../errors/AppError');

function createCatalogClient(baseUrl) {
  async function get(path) {
    const res = await fetch(`${baseUrl}${path}`);
    if (!res.ok) throw new Error(`catalog HTTP ${res.status}`);
    return res.json();
  }

  async function getStarterCards() {
    try {
      const data = await get('/cards/starter');
      return data.data;
    } catch {
      throw new AppError(503, 'CATALOG_UNAVAILABLE', 'Catálogo indisponível.');
    }
  }

  async function getRandomEnemy() {
    try {
      const data = await get('/enemies/random');
      return data.data;
    } catch {
      throw new AppError(503, 'CATALOG_UNAVAILABLE', 'Catálogo indisponível.');
    }
  }

  async function getRandomBoss() {
    try {
      const data = await get('/bosses/random');
      return data.data;
    } catch {
      throw new AppError(503, 'CATALOG_UNAVAILABLE', 'Catálogo indisponível.');
    }
  }

  async function getRewardCards(count = 3) {
    try {
      const data = await get('/cards');
      const cards = data.data.filter((c) => c.rarity !== 'basic');
      const shuffled = cards.sort(() => Math.random() - 0.5);
      return shuffled.slice(0, count);
    } catch {
      throw new AppError(503, 'CATALOG_UNAVAILABLE', 'Catálogo indisponível.');
    }
  }

  return { getStarterCards, getRandomEnemy, getRandomBoss, getRewardCards };
}

module.exports = { createCatalogClient };
