import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  scenarios: {
    multiple_runs: {
      executor: 'per-vu-iterations',
      vus: 1,
      iterations: 5,
      maxDuration: '15m',
    }
  }
};

const BASE_URL = 'http://localhost:3000/v1';
const TOTAL_ITERATIONS = 5;

function jsonHeaders(token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

function log(msg) {
  console.log(`[run-${__ITER + 1}] ${msg}`);
}

function safeJson(res, path) {
  try { return res.json(path); } catch { return null; }
}

export default function () {
  // Login
  log('Login...');
  const loginRes = http.post(
    `${BASE_URL}/auth/login`,
    JSON.stringify({ email: 'admin@email.com', password: 'admin123456' }),
    { headers: jsonHeaders() }
  );

  if (loginRes.status !== 200) {
    log(`Falha no login: ${loginRes.status} - aguardando 65s para reset do rate limit...`);
    sleep(65);
    return;
  }

  const token = loginRes.json('data.token');
  sleep(1);

  // Abandonar run ativa
  const runsRes = http.get(`${BASE_URL}/runs`, { headers: jsonHeaders(token) });
  const runs = safeJson(runsRes, 'data');
  if (runs && Array.isArray(runs)) {
    const activeRun = runs.find(r => r.status === 'active');
    if (activeRun) {
      log(`Abandonando run ativa...`);
      http.post(`${BASE_URL}/runs/${activeRun._id}/abandon`, '{}', { headers: jsonHeaders(token) });
      sleep(1);
    }
  }

  // Criar run
  log('Criando run...');
  const runRes = http.post(`${BASE_URL}/runs`, '{}', { headers: jsonHeaders(token) });

  if (runRes.status !== 201) {
    log(`Falha ao criar run: ${runRes.status}`);
    sleep(65);
    return;
  }

  check(runRes, { 'run criada': (r) => r.status === 201 });

  const runData = safeJson(runRes, 'data');
  if (!runData || !runData._id) { sleep(2); return; }

  const runId = runData._id;
  const deck = runData.deck || [];
  const attackCard = deck.find(c => c.type === 'attack') || deck[0];
  if (!attackCard) return;

  sleep(0.5);

  // Loop de batalhas
  let runStatus = 'active';
  let battleCount = 0;

  while (runStatus === 'active' && battleCount < 10) {
    battleCount++;

    // Retry em caso de 429
    let battleRes = http.post(`${BASE_URL}/runs/${runId}/battles`, '{}', { headers: jsonHeaders(token) });
    if (battleRes.status === 429) {
      log(`Rate limit na batalha ${battleCount}, aguardando 65s...`);
      sleep(65);
      battleRes = http.post(`${BASE_URL}/runs/${runId}/battles`, '{}', { headers: jsonHeaders(token) });
    }

    if (battleRes.status !== 201) {
      log(`Erro batalha ${battleCount}: ${battleRes.status}`);
      break;
    }

    const battleData = safeJson(battleRes, 'data');
    if (!battleData || !battleData._id) break;

    const battleId = battleData._id;
    const battleType = battleData.type || 'common';
    sleep(0.5);

    // Usar cartas
    let battleStatus = battleData.status || 'active';
    let turnCount = 0;

    while (battleStatus === 'active' && turnCount < 50) {
      turnCount++;

      let playRes = http.post(
        `${BASE_URL}/battles/${battleId}/actions/play-card`,
        JSON.stringify({ cardId: attackCard.cardId }),
        { headers: jsonHeaders(token) }
      );

      if (playRes.status === 429) {
        log(`Rate limit no turno ${turnCount}, aguardando 65s...`);
        sleep(65);
        playRes = http.post(
          `${BASE_URL}/battles/${battleId}/actions/play-card`,
          JSON.stringify({ cardId: attackCard.cardId }),
          { headers: jsonHeaders(token) }
        );
      }

      if (playRes.status !== 200) break;
      const playData = safeJson(playRes, 'data');
      battleStatus = playData ? playData.status : 'unknown';
      sleep(0.5);
    }

    if (battleStatus === 'lost' || battleStatus === 'defeat') {
      runStatus = 'defeat';
      break;
    }

    sleep(0.5);

    // Recompensa
    if (battleType === 'common') {
      const rewardRes = http.get(`${BASE_URL}/runs/${runId}/rewards`, { headers: jsonHeaders(token) });
      if (rewardRes.status === 200) {
        const reward = safeJson(rewardRes, 'data');
        if (reward && reward.status === 'pending' && reward.options && reward.options.length > 0) {
          const chosen = reward.options.find(c => c.type === 'attack') || reward.options[0];
          http.post(
            `${BASE_URL}/rewards/${reward._id}/choose`,
            JSON.stringify({ cardId: chosen.cardId }),
            { headers: jsonHeaders(token) }
          );
          sleep(0.5);
        }
      }
    }

    // Status da run
    const runCheckRes = http.get(`${BASE_URL}/runs/${runId}`, { headers: jsonHeaders(token) });
    const runCheckData = safeJson(runCheckRes, 'data');
    runStatus = runCheckData ? runCheckData.status : 'unknown';
    if (runStatus !== 'active') break;
    sleep(0.5);
  }

  log(`Run ${__ITER + 1} finalizada: ${runStatus}`);
  sleep(2);

  // Ranking final na última iteração
  if (__ITER === TOTAL_ITERATIONS - 1) {
    sleep(1);
    log('\n========== RANKING FINAL ==========');
    const rankingRes = http.get(`${BASE_URL}/ranking`, { headers: jsonHeaders(token) });
    const ranking = safeJson(rankingRes, 'data');

    if (ranking && ranking.length > 0) {
      ranking.forEach((entry, i) => {
        log(`#${i+1} ${entry.userName} | Runs: ${entry.totalRuns} | Vitorias: ${entry.victories} | Derrotas: ${entry.defeats} | BestScore: ${entry.bestScore}`);
      });
    }

    const meRes = http.get(`${BASE_URL}/ranking/me`, { headers: jsonHeaders(token) });
    const me = safeJson(meRes, 'data');
    if (me) {
      log(`\nRESUMO: ${me.totalRuns} runs | ${me.victories} vitorias | ${me.defeats} derrotas | Score: ${me.bestScore}`);
    }
  }
}
