const { Enemy } = require('../models/Enemy');

function createEnemyRepository() {
  return {
    async listActive() {
      return Enemy.find({ isActive: true }).sort({ createdAt: 1 });
    },

    async findById(id) {
      return Enemy.findOne({ _id: id, isActive: true });
    },

    async findRandom() {
      const count = await Enemy.countDocuments({ isActive: true });

      if (count === 0) {
        return null;
      }

      const skip = Math.floor(Math.random() * count);
      return Enemy.findOne({ isActive: true }).skip(skip);
    },

    async create(data) {
      return Enemy.create(data);
    },

    async update(id, data) {
      return Enemy.findOneAndUpdate(
        { _id: id, isActive: true },
        { $set: data },
        { new: true, runValidators: true }
      );
    },

    async softDelete(id) {
      return Enemy.findOneAndUpdate(
        { _id: id, isActive: true },
        { $set: { isActive: false, deletedAt: new Date() } },
        { new: true }
      );
    }
  };
}

module.exports = { createEnemyRepository };
