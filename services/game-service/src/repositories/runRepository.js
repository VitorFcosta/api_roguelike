const { Run } = require('../models/Run');

function createRunRepository() {
  return {
    async create(data) {
      return Run.create(data);
    },

    async findById(id) {
      return Run.findById(id);
    },

    async findByUserId(userId) {
      return Run.find({ userId }).sort({ createdAt: -1 });
    },

    async findActiveByUserId(userId) {
      return Run.findOne({ userId, status: 'active' });
    },

    async update(id, data) {
      return Run.findByIdAndUpdate(id, { $set: data }, { new: true, runValidators: true });
    },

    async addCardToDeck(id, card) {
      return Run.findByIdAndUpdate(id, { $push: { deck: card } }, { new: true });
    }
  };
}

module.exports = { createRunRepository };
