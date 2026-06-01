function createRankingClient(baseUrl) {
  async function registerRunResult({ userId, runId, status, floor }) {
    try {
      await fetch(`${baseUrl}/rankings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, runId, status, floor })
      });
    } catch {
      console.error('[ranking-client] Falha ao registrar resultado da run');
    }
  }

  return { registerRunResult };
}

module.exports = { createRankingClient };
