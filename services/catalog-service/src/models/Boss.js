const mongoose = require('mongoose');

const bossSchema = new mongoose.Schema(
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
    specialAttack: {
      type: Number,
      required: true,
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

bossSchema.index({ isActive: 1 });

const Boss = mongoose.model('Boss', bossSchema);

module.exports = { Boss };
