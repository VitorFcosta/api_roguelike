const { AppError } = require('../errors/AppError');

function createEnemyService({ enemyRepository }) {
  async function listActive(options = {}) {
    return enemyRepository.listActive(options);
  }

  async function findById(id) {
    const enemy = await enemyRepository.findById(id);

    if (!enemy) {
      throw new AppError(404, 'ENEMY_NOT_FOUND', 'Inimigo não encontrado.');
    }

    return enemy;
  }

  async function findRandom() {
    const enemy = await enemyRepository.findRandom();

    if (!enemy) {
      throw new AppError(404, 'ENEMY_NOT_FOUND', 'Nenhum inimigo disponível.');
    }

    return enemy;
  }

  async function create(data) {
    return enemyRepository.create(data);
  }

  async function update(id, data) {
    const enemy = await enemyRepository.update(id, data);

    if (!enemy) {
      throw new AppError(404, 'ENEMY_NOT_FOUND', 'Inimigo não encontrado.');
    }

    return enemy;
  }

  async function softDelete(id) {
    const enemy = await enemyRepository.softDelete(id);

    if (!enemy) {
      throw new AppError(404, 'ENEMY_NOT_FOUND', 'Inimigo não encontrado.');
    }

    return enemy;
  }

  return { listActive, findById, findRandom, create, update, softDelete };
}

module.exports = { createEnemyService };
