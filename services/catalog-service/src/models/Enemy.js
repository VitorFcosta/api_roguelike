const mongoose = require('mongoose');

const enemySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      required: true,
      trim: true
    },
    maxHp: {
      type: Number,
      required: true,
      min: 1
    },
    attack: {
      type: Number,
      required: true,
      min: 0
    },
    defense: {
      type: Number,
      required: true,
      default: 0,
      min: 0
    },
    difficulty: {
      type: Number,
      required: true,
      min: 1
    },
    isActive: {
      type: Boolean,
      required: true,
      default: true
    },
    deletedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

enemySchema.index({ isActive: 1 });

const Enemy = mongoose.model('Enemy', enemySchema);

module.exports = { Enemy };
