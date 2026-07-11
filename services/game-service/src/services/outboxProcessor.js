function sanitizeError(error) {
  const message = error?.message || 'Erro desconhecido ao publicar evento.';
  return String(message)
    .replace(/[\u0000-\u001f\u007f]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 500);
}

function calculateBackoffMs(attempts, baseDelayMs, maxDelayMs) {
  return Math.min(baseDelayMs * (2 ** Math.max(attempts - 1, 0)), maxDelayMs);
}

function createOutboxProcessor({
  outboxRepository,
  rankingClient,
  metrics,
  workerId,
  batchSize,
  maxAttempts,
  baseDelayMs,
  maxDelayMs,
  lockTimeoutMs,
  now = () => new Date(),
  onProgress = () => {}
}) {
  async function processEvent(event) {
    const stopTimer = metrics.processingDuration.startTimer();

    try {
      await rankingClient.registerRunResult(event.payload);
      await outboxRepository.markPublished(event._id, workerId, now());
      metrics.published.inc();
    } catch (error) {
      metrics.failures.inc();
      const lastError = sanitizeError(error);
      const shouldDeadLetter = error?.retryable === false || event.attempts >= maxAttempts;

      if (shouldDeadLetter) {
        await outboxRepository.markDeadLetter(event._id, workerId, lastError);
        metrics.deadLetters.inc();
      } else {
        const delayMs = calculateBackoffMs(event.attempts, baseDelayMs, maxDelayMs);
        await outboxRepository.scheduleRetry(event._id, workerId, {
          nextAttemptAt: new Date(now().getTime() + delayMs),
          lastError
        });
      }
    } finally {
      stopTimer();
    }
  }

  async function processCycle() {
    let processed = 0;
    onProgress();

    while (processed < batchSize) {
      const event = await outboxRepository.claimNext({
        now: now(),
        lockTimeoutMs,
        workerId
      });
      if (!event) break;

      onProgress();
      await processEvent(event);
      onProgress();
      processed += 1;
    }

    const pending = await outboxRepository.countPending();
    metrics.pending.set(pending);
    return processed;
  }

  return { processCycle, processEvent };
}

module.exports = { createOutboxProcessor, sanitizeError, calculateBackoffMs };
