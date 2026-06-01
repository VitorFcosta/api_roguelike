const { Reward } = require('../models/Reward');

function createRewardRepository() {
  return {
    async create(data) {
      return Reward.create(data);
    },

    async findById(id) {
      return Reward.findById(id);
    },

    async findPendingByRunId(runId) {
      return Reward.findOne({ runId, status: 'pending' });
    },

    async update(id, data) {
      return Reward.findByIdAndUpdate(id, { $set: data }, { new: true, runValidators: true });
    }
  };
}

module.exports = { createRewardRepository };
