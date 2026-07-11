const { OutboxEvent } = require('../models/OutboxEvent');

function createOutboxRepository() {
  return {
    async createRunFinished(payload, { session } = {}) {
      const data = {
        type: 'run.finished',
        aggregateId: String(payload.runId),
        payload: {
          runId: String(payload.runId),
          userId: String(payload.userId),
          status: payload.status,
          floor: payload.floor
        }
      };

      if (session) {
        const [event] = await OutboxEvent.create([data], { session });
        return event;
      }

      return OutboxEvent.create(data);
    },

    async claimNext({ now, lockTimeoutMs, workerId }) {
      const staleBefore = new Date(now.getTime() - lockTimeoutMs);

      return OutboxEvent.findOneAndUpdate(
        {
          $or: [
            { status: 'pending', nextAttemptAt: { $lte: now } },
            { status: 'processing', lockedAt: { $lte: staleBefore } }
          ]
        },
        {
          $set: {
            status: 'processing',
            lockedAt: now,
            lockedBy: workerId
          },
          $inc: { attempts: 1 }
        },
        { new: true, sort: { createdAt: 1 } }
      );
    },

    async markPublished(id, workerId, publishedAt = new Date()) {
      return OutboxEvent.findOneAndUpdate(
        { _id: id, status: 'processing', lockedBy: workerId },
        {
          $set: {
            status: 'published',
            publishedAt,
            lastError: null,
            lockedAt: null,
            lockedBy: null
          }
        },
        { new: true }
      );
    },

    async scheduleRetry(id, workerId, { nextAttemptAt, lastError }) {
      return OutboxEvent.findOneAndUpdate(
        { _id: id, status: 'processing', lockedBy: workerId },
        {
          $set: {
            status: 'pending',
            nextAttemptAt,
            lastError,
            lockedAt: null,
            lockedBy: null
          }
        },
        { new: true }
      );
    },

    async markDeadLetter(id, workerId, lastError) {
      return OutboxEvent.findOneAndUpdate(
        { _id: id, status: 'processing', lockedBy: workerId },
        {
          $set: {
            status: 'dead_letter',
            lastError,
            lockedAt: null,
            lockedBy: null
          }
        },
        { new: true }
      );
    },

    async countPending() {
      return OutboxEvent.countDocuments({ status: 'pending' });
    },

    async retryDeadLetters({ eventId, all = false }) {
      const filter = all ? { status: 'dead_letter' } : { _id: eventId, status: 'dead_letter' };
      return OutboxEvent.updateMany(filter, {
        $set: {
          status: 'pending',
          attempts: 0,
          nextAttemptAt: new Date(),
          lastError: null,
          lockedAt: null,
          lockedBy: null,
          publishedAt: null
        }
      });
    }
  };
}

module.exports = { createOutboxRepository };
