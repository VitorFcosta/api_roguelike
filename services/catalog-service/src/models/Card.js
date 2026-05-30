const mongoose = require('mongoose');

const cardSchema = new mongoose.Schema(
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
    type: {
      type: String,
      enum: ['attack', 'block', 'heal'],
      required: true
    },
    cost: {
      type: Number,
      required: true,
      min: 0
    },
    value: {
      type: Number,
      required: true,
      min: 1
    },
    rarity: {
      type: String,
      enum: ['basic', 'common', 'rare'],
      required: true
    },
    isStarter: {
      type: Boolean,
      required: true,
      default: false
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

cardSchema.index({ isActive: 1 });
cardSchema.index({ isStarter: 1, isActive: 1 });

const Card = mongoose.model('Card', cardSchema);

module.exports = { Card };
