const { AppError } = require('../errors/AppError');

function createCardService({ cardRepository }) {
  async function listActive() {
    return cardRepository.listActive();
  }

  async function findById(id) {
    const card = await cardRepository.findById(id);

    if (!card) {
      throw new AppError(404, 'CARD_NOT_FOUND', 'Carta não encontrada.');
    }

    return card;
  }

  async function findStarters() {
    return cardRepository.findStarters();
  }

  async function create(data) {
    return cardRepository.create(data);
  }

  async function update(id, data) {
    const card = await cardRepository.update(id, data);

    if (!card) {
      throw new AppError(404, 'CARD_NOT_FOUND', 'Carta não encontrada.');
    }

    return card;
  }

  async function softDelete(id) {
    const card = await cardRepository.softDelete(id);

    if (!card) {
      throw new AppError(404, 'CARD_NOT_FOUND', 'Carta não encontrada.');
    }

    return card;
  }

  return { listActive, findById, findStarters, create, update, softDelete };
}

module.exports = { createCardService };
