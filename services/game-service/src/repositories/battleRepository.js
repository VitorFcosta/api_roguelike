const { Battle } = require('../models/Battle');

function createBattleRepository() {
  return {
    async create(data) {
      return Battle.create(data);
    },

    async findById(id) {
      return Battle.findById(id);
    },

    async findActiveByRunId(runId) {
      return Battle.findOne({ runId, status: 'active' });
    },

    async update(id, data) {
      return Battle.findByIdAndUpdate(id, { $set: data }, { new: true, runValidators: true });
    },

    async updateIfActiveAtTurn(id, expectedTurn, data) {
      return Battle.findOneAndUpdate(
        { _id: id, status: 'active', turn: expectedTurn },
        { $set: data },
        { new: true, runValidators: true }
      );
    }
  };
}

module.exports = { createBattleRepository };
