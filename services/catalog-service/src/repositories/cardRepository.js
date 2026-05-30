const { Card } = require('../models/Card');

function createCardRepository() {
  return {
    async listActive() {
      return Card.find({ isActive: true }).sort({ createdAt: 1 });
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
