const mongoose = require('mongoose');

const rankingSchema = new mongoose.Schema({
  userId:     { type: String, required: true, unique: true },
  userName:   { type: String, required: true },
  totalRuns:  { type: Number, required: true, default: 0 },
  victories:  { type: Number, required: true, default: 0 },
  defeats:    { type: Number, required: true, default: 0 },
  bestScore:  { type: Number, required: true, default: 0 },
  bossKills:  { type: Number, required: true, default: 0 },
  lastRunAt:  { type: Date, default: null }
}, { timestamps: true, versionKey: false });

rankingSchema.index({ bestScore: -1 });
rankingSchema.index({ victories: -1 });

const Ranking = mongoose.model('Ranking', rankingSchema);

module.exports = { Ranking };
