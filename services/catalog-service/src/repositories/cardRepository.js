const { Card } = require('../models/Card');
const { buildNameRegexFilter } = require('../utils/queryFilters');

function parsePagination({ limit = 50, page = 1 } = {}) {
  const parsedLimit = Math.min(Math.max(Number(limit) || 50, 1), 100);
  const parsedPage = Math.max(Number(page) || 1, 1);
  return { limit: parsedLimit, skip: (parsedPage - 1) * parsedLimit };
}

function parseSort(sort = 'createdAt') {
  const allowed = ['createdAt', 'name', 'type', 'rarity', 'cost', 'value'];
  const direction = String(sort).startsWith('-') ? -1 : 1;
  const field = String(sort).replace(/^-/, '');
  return { [allowed.includes(field) ? field : 'createdAt']: direction };
}

function createCardRepository() {
  return {
    async listActive(options = {}) {
      const { limit, skip } = parsePagination(options);
      const query = { isActive: true };

      const nameFilter = buildNameRegexFilter(options.name);
      if (nameFilter) query.name = nameFilter;
      if (options.type) query.type = options.type;
      if (options.rarity) query.rarity = options.rarity;
      if (options.isStarter !== undefined) {
        query.isStarter = String(options.isStarter) === 'true';
      }

      return Card.find(query)
        .sort(parseSort(options.sort))
        .skip(skip)
        .limit(limit);
    },

    async findById(id) {
      return Card.findOne({ _id: id, isActive: true });
    },

    async findStarters() {
      return Card.find({ isStarter: true, isActive: true }).sort({ createdAt: 1 });
    },

    async create(data) {
      return Card.create(data);
    },

    async update(id, data) {
      return Card.findOneAndUpdate(
        { _id: id, isActive: true },
        { $set: data },
        { new: true, runValidators: true }
      );
    },

    async softDelete(id) {
      return Card.findOneAndUpdate(
        { _id: id, isActive: true },
        { $set: { isActive: false, deletedAt: new Date() } },
        { new: true }
      );
    }
  };
}

module.exports = { createCardRepository };
