const mongoose = require('mongoose');

const rewardCardSchema = new mongoose.Schema(
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

const rewardSchema = new mongoose.Schema(
  {
    runId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Run',
      required: true,
      index: true
    },
    battleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Battle',
      required: true
    },
    status: {
      type: String,
      enum: ['pending', 'chosen'],
      required: true,
      default: 'pending'
    },
    options: {
      type: [rewardCardSchema],
      required: true
    },
    chosenCardId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null
    },
    chosenAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

const Reward = mongoose.model('Reward', rewardSchema);

module.exports = { Reward };
