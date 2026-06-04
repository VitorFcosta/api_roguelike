const { Boss } = require('../models/Boss');

function parsePagination({ limit = 50, page = 1 } = {}) {
  const parsedLimit = Math.min(Math.max(Number(limit) || 50, 1), 100);
  const parsedPage = Math.max(Number(page) || 1, 1);
  return { limit: parsedLimit, skip: (parsedPage - 1) * parsedLimit };
}

function parseSort(sort = 'createdAt') {
  const allowed = ['createdAt', 'name', 'difficulty', 'maxHp', 'attack'];
  const direction = String(sort).startsWith('-') ? -1 : 1;
  const field = String(sort).replace(/^-/, '');
  return { [allowed.includes(field) ? field : 'createdAt']: direction };
}

function createBossRepository() {
  return {
    async listActive(options = {}) {
      const { limit, skip } = parsePagination(options);
      const query = { isActive: true };

      if (options.name) query.name = { $regex: options.name, $options: 'i' };
      if (options.difficulty) query.difficulty = Number(options.difficulty);

      return Boss.find(query)
        .sort(parseSort(options.sort))
        .skip(skip)
        .limit(limit);
    },

    async findById(id) {
      return Boss.findOne({ _id: id, isActive: true });
    },

    async findRandom() {
      const count = await Boss.countDocuments({ isActive: true });

      if (count === 0) {
        return null;
      }

      const skip = Math.floor(Math.random() * count);
      return Boss.findOne({ isActive: true }).skip(skip);
    },

    async create(data) {
      return Boss.create(data);
    },

    async update(id, data) {
      return Boss.findOneAndUpdate(
        { _id: id, isActive: true },
        { $set: data },
        { new: true, runValidators: true }
      );
    },

    async softDelete(id) {
      return Boss.findOneAndUpdate(
        { _id: id, isActive: true },
        { $set: { isActive: false, deletedAt: new Date() } },
        { new: true }
      );
    }
  };
}

module.exports = { createBossRepository };
