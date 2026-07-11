const mongoose = require('mongoose');

const runFinishedPayloadSchema = new mongoose.Schema(
  {
    runId: { type: String, required: true, maxlength: 100 },
    userId: { type: String, required: true, maxlength: 100 },
    status: {
      type: String,
      enum: ['victory', 'defeat', 'abandoned'],
      required: true
    },
    floor: { type: Number, required: true, min: 1, max: 100 }
  },
  { _id: false }
);

const outboxEventSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ['run.finished'], required: true },
    aggregateId: { type: String, required: true, maxlength: 100 },
    payload: { type: runFinishedPayloadSchema, required: true },
    status: {
      type: String,
      enum: ['pending', 'processing', 'published', 'dead_letter'],
      required: true,
      default: 'pending'
    },
    attempts: { type: Number, required: true, default: 0, min: 0 },
    nextAttemptAt: { type: Date, required: true, default: Date.now },
    lockedAt: { type: Date, default: null },
    lockedBy: { type: String, default: null, maxlength: 200 },
    lastError: { type: String, default: null, maxlength: 500 },
    publishedAt: { type: Date, default: null }
  },
  { timestamps: true, versionKey: false }
);

outboxEventSchema.index(
  { type: 1, aggregateId: 1 },
  { unique: true, name: 'unique_event_per_aggregate' }
);
outboxEventSchema.index(
  { status: 1, nextAttemptAt: 1, createdAt: 1 },
  { name: 'outbox_dispatch_queue' }
);

const OutboxEvent = mongoose.model('OutboxEvent', outboxEventSchema);

module.exports = { OutboxEvent };
