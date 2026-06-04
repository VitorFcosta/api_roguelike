const { Run } = require('../models/Run');

function parsePagination({ limit = 50, page = 1 } = {}) {
  const parsedLimit = Math.min(Math.max(Number(limit) || 50, 1), 100);
  const parsedPage = Math.max(Number(page) || 1, 1);
  return { limit: parsedLimit, skip: (parsedPage - 1) * parsedLimit };
}

function createRunRepository() {
  return {
    async create(data) {
      return Run.create(data);
    },

    async findById(id) {
      return Run.findById(id);
    },

    async findByUserId(userId, options = {}) {
      const { limit, skip } = parsePagination(options);
      const query = { userId };

      if (options.status) query.status = options.status;

      return Run.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);
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
