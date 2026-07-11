const mongoose = require('mongoose');

const processedRunSchema = new mongoose.Schema({
  runId: { type: String, required: true, unique: true, maxlength: 100, trim: true },
  userId: { type: String, required: true },
  status: {
    type: String,
    required: true,
    enum: ['victory', 'defeat', 'abandoned']
  },
  floor: { type: Number, required: true, min: 1, max: 100 },
  processedAt: { type: Date, required: true, default: Date.now }
}, { versionKey: false });

const ProcessedRun = mongoose.model('ProcessedRun', processedRunSchema);

module.exports = { ProcessedRun };
