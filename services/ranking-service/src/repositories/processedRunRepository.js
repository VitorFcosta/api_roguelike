const { ProcessedRun } = require('../models/ProcessedRun');

function createProcessedRunRepository() {
  async function findByRunId(runId, { session } = {}) {
    return ProcessedRun.findOne({ runId }).session(session || null).lean();
  }

  async function create(data, { session } = {}) {
    const [processedRun] = await ProcessedRun.create([data], { session });
    return processedRun.toObject();
  }

  async function deleteAll({ session } = {}) {
    return ProcessedRun.deleteMany({}, { session });
  }

  return { findByRunId, create, deleteAll };
}

module.exports = { createProcessedRunRepository };
