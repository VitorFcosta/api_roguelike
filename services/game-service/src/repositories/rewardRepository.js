const { Reward } = require('../models/Reward');

function createRewardRepository() {
  return {
    async create(data, { session } = {}) {
      if (session) {
        const [reward] = await Reward.create([data], { session });
        return reward;
      }

      return Reward.create(data);
    },

    async findById(id, { session } = {}) {
      return Reward.findById(id).session(session || null);
    },

    async findPendingByRunId(runId, { session } = {}) {
      return Reward.findOne({ runId, status: 'pending' }).session(session || null);
    },

    async update(id, data, { session } = {}) {
      return Reward.findByIdAndUpdate(
        id,
        { $set: data },
        { new: true, runValidators: true, session }
      );
    },

    async claim(id, cardId, { session } = {}) {
      return Reward.findOneAndUpdate(
        { _id: id, status: 'pending', 'options.cardId': cardId },
        {
          $set: {
            status: 'chosen',
            chosenCardId: cardId,
            chosenAt: new Date()
          }
        },
        { new: true, runValidators: true, session }
      );
    }
  };
}

module.exports = { createRewardRepository };
