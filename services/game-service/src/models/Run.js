const mongoose = require('mongoose');

const cardInDeckSchema = new mongoose.Schema(
  {
    cardId: { type: mongoose.Schema.Types.ObjectId, required: true },
    name: { type: String, required: true },
    type: { type: String, enum: ['attack', 'block', 'heal'], required: true },
    cost: { type: Number, required: true },
    value: { type: Number, required: true },
    rarity: { type: String, enum: ['basic', 'common', 'rare'], required: true }
  },
  { _id: false }
);

const runSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true
    },
    status: {
      type: String,
      enum: ['active', 'victory', 'defeat', 'abandoned'],
      required: true,
      default: 'active'
    },
    playerHp: {
      type: Number,
      required: true,
      min: 0
    },
    playerMaxHp: {
      type: Number,
      required: true,
      min: 1
    },
    floor: {
      type: Number,
      required: true,
      default: 1,
      min: 1
    },
    deck: {
      type: [cardInDeckSchema],
      required: true,
      default: []
    },
    finishedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

runSchema.index({ userId: 1, status: 1 });

const Run = mongoose.model('Run', runSchema);

module.exports = { Run };
