import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  scenarios: {
    populate: {
      executor: 'per-vu-iterations',
      vus: 1,
      iterations: 1,
      maxDuration: '30m',
    }
  }
};

const BASE_URL = 'http://localhost:3000/v1';
const LOAD_PASSWORD = __ENV.LOAD_PASSWORD || 'senha-forte-12345';
const ADMIN_EMAIL = __ENV.ADMIN_EMAIL || 'admin@email.com';
const ADMIN_PASSWORD = __ENV.ADMIN_PASSWORD || 'senha-admin-forte-12345';

// 8 jogadores com nomes diferentes
const PLAYERS = [
  { name: 'Arthur Silva',   email: 'arthur@roguelike.com',  password: LOAD_PASSWORD },
  { name: 'Beatriz Costa',  email: 'beatriz@roguelike.com', password: LOAD_PASSWORD },
  { name: 'Carlos Mendes',  email: 'carlos@roguelike.com',  password: LOAD_PASSWORD },
  { name: 'Diana Ferreira', email: 'diana@roguelike.com',   password: LOAD_PASSWORD },
  { name: 'Eduardo Lima',   email: 'eduardo@roguelike.com', password: LOAD_PASSWORD },
  { name: 'Fernanda Rocha', email: 'fernanda@roguelike.com',password: LOAD_PASSWORD },
  { name: 'Gabriel Nunes',  email: 'gabriel@roguelike.com', password: LOAD_PASSWORD },
  { name: 'Helena Souza',   email: 'helena@roguelike.com',  password: LOAD_PASSWORD },
];

function jsonHeaders(token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

function log(msg) {
  console.log(`[populate] ${msg}`);
}

function safeJson(res, path) {
  try { return res.json(path); } catch { return null; }
}

function waitIfRateLimited(res) {
  if (res.status === 429) {
    log('Rate limit atingido, aguardando 65s...');
    sleep(65);
    return true;
  }
  return false;
}

function playRun(token, playerName) {
  // Abandonar run ativa se existir
  const runsRes = http.get(`${BASE_URL}/runs`, { headers: jsonHeaders(token) });
  const runs = safeJson(runsRes, 'data');
  if (runs && Array.isArray(runs)) {
    const activeRun = runs.find(r => r.status === 'active');
    if (activeRun) {
      http.post(`${BASE_URL}/runs/${activeRun._id}/abandon`, '{}', { headers: jsonHeaders(token) });
      sleep(1);
    }
  }

  // Criar run
  let runRes = http.post(`${BASE_URL}/runs`, '{}', { headers: jsonHeaders(token) });
  if (waitIfRateLimited(runRes)) {
    runRes = http.post(`${BASE_URL}/runs`, '{}', { headers: jsonHeaders(token) });
  }
  if (runRes.status !== 201) {
    log(`${playerName}: Erro ao criar run: ${runRes.status}`);
    return 'error';
  }

  const runData = safeJson(runRes, 'data');
  if (!runData || !runData._id) return 'error';

  const runId = runData._id;
  const deck = runData.deck || [];
  const attackCard = deck.find(c => c.type === 'attack') || deck[0];
  if (!attackCard) return 'error';

  sleep(0.5);

  let runStatus = 'active';
  let battleCount = 0;

  while (runStatus === 'active' && battleCount < 10) {
    battleCount++;

    let battleRes = http.post(`${BASE_URL}/runs/${runId}/battles`, '{}', { headers: jsonHeaders(token) });
    if (waitIfRateLimited(battleRes)) {
      battleRes = http.post(`${BASE_URL}/runs/${runId}/battles`, '{}', { headers: jsonHeaders(token) });
    }
    if (battleRes.status !== 201) break;

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
      if (waitIfRateLimited(playRes)) {
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

    if (battleStatus === 'defeat') {
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

    const runCheckRes = http.get(`${BASE_URL}/runs/${runId}`, { headers: jsonHeaders(token) });
    const runCheckData = safeJson(runCheckRes, 'data');
    runStatus = runCheckData ? runCheckData.status : 'unknown';
    if (runStatus !== 'active') break;
    sleep(0.5);
  }

  return runStatus;
}

export default function () {
  log('=== POPULANDO RANKING COM MÚLTIPLOS JOGADORES ===\n');

  for (let i = 0; i < PLAYERS.length; i++) {
    const player = PLAYERS[i];
    log(`\n--- Jogador ${i + 1}/${PLAYERS.length}: ${player.name} ---`);

    // Cadastrar usuário
    let regRes = http.post(
      `${BASE_URL}/auth/register`,
      JSON.stringify({ name: player.name, email: player.email, password: player.password }),
      { headers: jsonHeaders() }
    );
    if (waitIfRateLimited(regRes)) {
      regRes = http.post(
        `${BASE_URL}/auth/register`,
        JSON.stringify({ name: player.name, email: player.email, password: player.password }),
        { headers: jsonHeaders() }
      );
    }

    if (regRes.status !== 201 && regRes.status !== 409) {
      log(`Erro ao cadastrar ${player.name}: ${regRes.status}`);
      continue;
    }

    if (regRes.status === 409) {
      log(`${player.name} já cadastrado, fazendo login...`);
    } else {
      log(`${player.name} cadastrado com sucesso!`);
    }

    sleep(0.5);

    // Login
    let loginRes = http.post(
      `${BASE_URL}/auth/login`,
      JSON.stringify({ email: player.email, password: player.password }),
      { headers: jsonHeaders() }
    );
    if (waitIfRateLimited(loginRes)) {
      loginRes = http.post(
        `${BASE_URL}/auth/login`,
        JSON.stringify({ email: player.email, password: player.password }),
        { headers: jsonHeaders() }
      );
    }

    if (loginRes.status !== 200) {
      log(`Erro no login de ${player.name}: ${loginRes.status}`);
      continue;
    }

    const token = loginRes.json('data.token');
    sleep(0.5);

    // Jogar 2 runs por jogador
    for (let r = 0; r < 2; r++) {
      log(`${player.name} - Run ${r + 1}/2...`);
      const result = playRun(token, player.name);
      log(`${player.name} - Run ${r + 1} finalizada: ${result}`);
      sleep(1);
    }

    sleep(2);
  }

  // Mostrar ranking final com todos os jogadores
  sleep(2);
  log('\n\n========== RANKING FINAL ==========');

  // Login como admin para ver ranking
  const adminLogin = http.post(
    `${BASE_URL}/auth/login`,
    JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
    { headers: jsonHeaders() }
  );

  if (adminLogin.status === 200) {
    const adminToken = adminLogin.json('data.token');
    const rankingRes = http.get(`${BASE_URL}/ranking`, { headers: jsonHeaders(adminToken) });
    const ranking = safeJson(rankingRes, 'data');

    if (ranking && ranking.length > 0) {
      log(`Total de jogadores no ranking: ${ranking.length}\n`);
      ranking.forEach((entry, i) => {
        log(`#${i+1} ${entry.userName} | Runs: ${entry.totalRuns} | Vitorias: ${entry.victories} | Derrotas: ${entry.defeats} | BossKills: ${entry.bossKills} | BestScore: ${entry.bestScore}`);
      });
    }
  }
}
