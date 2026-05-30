const { AppError } = require('../errors/AppError');

function createBossService({ bossRepository }) {
  async function listActive() {
    return bossRepository.listActive();
  }

  async function findById(id) {
    const boss = await bossRepository.findById(id);

    if (!boss) {
      throw new AppError(404, 'BOSS_NOT_FOUND', 'Boss não encontrado.');
    }

    return boss;
  }

  async function findRandom() {
    const boss = await bossRepository.findRandom();

    if (!boss) {
      throw new AppError(404, 'BOSS_NOT_FOUND', 'Nenhum boss disponível.');
    }

    return boss;
  }

  async function create(data) {
    return bossRepository.create(data);
  }

  async function update(id, data) {
    const boss = await bossRepository.update(id, data);

    if (!boss) {
      throw new AppError(404, 'BOSS_NOT_FOUND', 'Boss não encontrado.');
    }

    return boss;
  }

  async function softDelete(id) {
    const boss = await bossRepository.softDelete(id);

    if (!boss) {
      throw new AppError(404, 'BOSS_NOT_FOUND', 'Boss não encontrado.');
    }

    return boss;
  }

  return { listActive, findById, findRandom, create, update, softDelete };
}

module.exports = { createBossService };
