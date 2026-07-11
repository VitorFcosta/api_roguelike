const { Run } = require('../models/Run');

function parsePagination({ limit = 50, page = 1 } = {}) {
  const parsedLimit = Math.min(Math.max(Number(limit) || 50, 1), 100);
  const parsedPage = Math.max(Number(page) || 1, 1);
  return { limit: parsedLimit, skip: (parsedPage - 1) * parsedLimit };
}

function createRunRepository() {
  return {
    async create(data, { session } = {}) {
      if (session) {
        const [run] = await Run.create([data], { session });
        return run;
      }

      return Run.create(data);
    },

    async findById(id, { session } = {}) {
      return Run.findById(id).session(session || null);
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

    async findActiveByUserId(userId, { session } = {}) {
      return Run.findOne({ userId, status: 'active' }).session(session || null);
    },

    async update(id, data, { session } = {}) {
      return Run.findByIdAndUpdate(
        id,
        { $set: data },
        { new: true, runValidators: true, session }
      );
    },

    async updateIfStatus(id, status, data, { session } = {}) {
      return Run.findOneAndUpdate(
        { _id: id, status },
        { $set: data },
        { new: true, runValidators: true, session }
      );
    },

    async addCardToDeck(id, card, { session } = {}) {
      return Run.findByIdAndUpdate(
        id,
        { $push: { deck: card } },
        { new: true, runValidators: true, session }
      );
    }
  };
}

module.exports = { createRunRepository };
