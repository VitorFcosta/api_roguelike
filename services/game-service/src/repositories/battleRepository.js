const { Battle } = require('../models/Battle');

function createBattleRepository() {
  return {
    async create(data, { session } = {}) {
      if (session) {
        const [battle] = await Battle.create([data], { session });
        return battle;
      }

      return Battle.create(data);
    },

    async findById(id, { session } = {}) {
      return Battle.findById(id).session(session || null);
    },

    async findActiveByRunId(runId, { session } = {}) {
      return Battle.findOne({ runId, status: 'active' }).session(session || null);
    },

    async update(id, data, { session } = {}) {
      return Battle.findByIdAndUpdate(
        id,
        { $set: data },
        { new: true, runValidators: true, session }
      );
    },

    async updateIfActiveAtTurn(id, expectedTurn, data, { session } = {}) {
      return Battle.findOneAndUpdate(
        { _id: id, status: 'active', turn: expectedTurn },
        { $set: data },
        { new: true, runValidators: true, session }
      );
    }
  };
}

module.exports = { createBattleRepository };
