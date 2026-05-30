const { Boss } = require('../models/Boss');

function createBossRepository() {
  return {
    async listActive() {
      return Boss.find({ isActive: true }).sort({ createdAt: 1 });
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
