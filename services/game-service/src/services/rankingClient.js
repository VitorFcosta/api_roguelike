class RankingClientError extends Error {
  constructor(message, { statusCode = null, retryable = true } = {}) {
    super(message);
    this.name = 'RankingClientError';
    this.statusCode = statusCode;
    this.retryable = retryable;
  }
}

function isRetryableStatus(statusCode) {
  return statusCode === 408 || statusCode === 429 || statusCode >= 500;
}

function createRankingClient({ baseUrl, internalServiceSecret, timeoutMs = 5000 }) {
  async function registerRunResult({ userId, runId, status, floor }) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(`${baseUrl}/ranking/events/run-finished`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Service-Secret': internalServiceSecret
        },
        body: JSON.stringify({ userId, runId, status, floor }),
        signal: controller.signal
      });

      if (!response.ok) {
        throw new RankingClientError(`Ranking respondeu com HTTP ${response.status}.`, {
          statusCode: response.status,
          retryable: isRetryableStatus(response.status)
        });
      }

      return response.json().catch(() => null);
    } catch (error) {
      if (error instanceof RankingClientError) throw error;

      const timedOut = error?.name === 'AbortError';
      throw new RankingClientError(
        timedOut ? 'Timeout ao chamar o ranking.' : 'Falha de rede ao chamar o ranking.',
        { retryable: true }
      );
    } finally {
      clearTimeout(timeout);
    }
  }

  return { registerRunResult };
}

module.exports = { createRankingClient, RankingClientError, isRetryableStatus };
