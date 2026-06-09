import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  scenarios: {
    victory_flow: {
      executor: 'per-vu-iterations',
      vus: 1,
      iterations: 5,
      maxDuration: '20m',
    }
  },
  thresholds: {
    checks: ['rate==1'],
    http_req_duration: ['p(95)<1000'],
    http_req_failed: ['rate<0.02'],
  },
};

const BASE_URL = 'http://localhost:3000/v1';
const ADMIN_EMAIL = __ENV.ADMIN_EMAIL || 'admin@email.com';
const ADMIN_PASSWORD = __ENV.ADMIN_PASSWORD || 'senha-admin-forte-12345';
const TOTAL_ITERATIONS = 5;
const RATE_LIMIT_WAIT_SECONDS = 65;
const TEST_CARD_NAME = 'K6 Victory Blade';
const TEST_CARD_DAMAGE = 999;

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

function api(method, path, token, body, label) {
  const url = `${BASE_URL}${path}`;
  const params = { headers: jsonHeaders(token) };
  const payload = body === undefined ? null : JSON.stringify(body);
  let res;

  if (method === 'GET') {
    res = http.get(url, params);
  } else if (method === 'POST') {
    res = http.post(url, payload, params);
  } else if (method === 'DELETE') {
    res = http.del(url, payload, params);
  } else {
    throw new Error(`Metodo HTTP nao suportado no teste: ${method}`);
  }

  if (res.status === 429) {
    log(`Rate limit em ${label}, aguardando ${RATE_LIMIT_WAIT_SECONDS}s...`);
    sleep(RATE_LIMIT_WAIT_SECONDS);
    if (method === 'GET') return http.get(url, params);
    if (method === 'DELETE') return http.del(url, payload, params);
    return http.post(url, payload, params);
  }

  return res;
}

function listData(res) {
  const data = safeJson(res, 'data');
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.items)) return data.items;
  return [];
}

function getRun(token, runId) {
  const res = api('GET', `/runs/${runId}`, token, undefined, 'buscar run');
  return safeJson(res, 'data');
}

function getRankingMe(token) {
  const res = api('GET', '/ranking/me', token, undefined, 'ranking/me');
  return safeJson(res, 'data') || {
    totalRuns: 0,
    victories: 0,
    defeats: 0,
    bestScore: 0,
  };
}

function strongestAttack(cards) {
  if (!Array.isArray(cards) || cards.length === 0) return null;

  const attacks = cards.filter((card) => card.type === 'attack');
  const candidates = attacks.length > 0 ? attacks : cards;

  return candidates.reduce((best, card) => {
    const bestValue = Number(best.value || 0);
    const cardValue = Number(card.value || 0);
    return cardValue > bestValue ? card : best;
  }, candidates[0]);
}

function ensureVictoryStarter(token) {
  const searchRes = api(
    'GET',
    `/cards?name=${encodeURIComponent(TEST_CARD_NAME)}&limit=50`,
    token,
    undefined,
    'buscar carta k6'
  );
  const existing = listData(searchRes).find((card) => (
    card.name === TEST_CARD_NAME &&
    card.type === 'attack' &&
    card.isStarter === true
  ));

  if (existing) {
    return { ok: true, cardId: existing._id };
  }

  const createRes = api(
    'POST',
    '/cards',
    token,
    {
      name: TEST_CARD_NAME,
      description: 'Carta starter usada pelo teste k6 de fluxo completo.',
      type: 'attack',
      value: TEST_CARD_DAMAGE,
      cost: 0,
      rarity: 'common',
      isStarter: true,
    },
    'criar carta k6'
  );

  const ok = check(createRes, {
    'carta starter k6 preparada': (r) => r.status === 201,
  });
  const created = safeJson(createRes, 'data');

  return {
    ok,
    cardId: created && created._id,
  };
}

function cleanupVictoryStarter(token, cardId) {
  if (!cardId) return;

  const deleteRes = api('DELETE', `/cards/${cardId}`, token, undefined, 'remover carta k6');
  check(deleteRes, {
    'carta starter k6 removida': (r) => r.status === 200,
  });
}

function abandonActiveRun(token) {
  const runsRes = api('GET', '/runs?status=active&limit=20', token, undefined, 'listar runs ativas');
  const activeRuns = listData(runsRes).filter((run) => run.status === 'active');

  activeRuns.forEach((run) => {
    log(`Abandonando run ativa ${run._id} antes do teste...`);
    api('POST', `/runs/${run._id}/abandon`, token, {}, 'abandonar run ativa');
    sleep(0.5);
  });
}

function chooseReward(token, runId) {
  const rewardRes = api('GET', `/runs/${runId}/rewards`, token, undefined, 'buscar recompensa');
  const reward = safeJson(rewardRes, 'data');

  const rewardIsValid = check({ rewardRes, reward }, {
    'recompensa retornou 200': (data) => data.rewardRes.status === 200,
    'recompensa pendente': (data) => data.reward && data.reward.status === 'pending',
    'recompensa tem 3 opcoes': (data) => data.reward && data.reward.options && data.reward.options.length === 3,
  });

  if (!rewardIsValid) return false;

  const chosen = strongestAttack(reward.options) || reward.options[0];
  const chooseRes = api(
    'POST',
    `/rewards/${reward._id}/choose`,
    token,
    { cardId: chosen.cardId },
    'escolher recompensa'
  );

  return check(chooseRes, {
    'recompensa escolhida': (r) => r.status === 200,
  });
}

function playBattle(token, runId, battleData, currentDeck) {
  const battleId = battleData._id;
  const battleType = battleData.type || 'common';
  let battleStatus = battleData.status || 'active';
  let runDeck = currentDeck || [];
  let turnCount = 0;

  while (battleStatus === 'active' && turnCount < 20) {
    turnCount++;
    const attackCard = strongestAttack(runDeck);
    if (!attackCard) {
      return {
        status: 'missing_card',
        type: battleType,
        turns: turnCount,
        deck: runDeck,
      };
    }

    const playRes = api(
      'POST',
      `/battles/${battleId}/actions/play-card`,
      token,
      { cardId: attackCard.cardId },
      `turno ${turnCount}`
    );

    if (playRes.status !== 200) {
      return {
        status: `http_${playRes.status}`,
        type: battleType,
        turns: turnCount,
        deck: runDeck,
      };
    }

    const playData = safeJson(playRes, 'data');
    battleStatus = playData ? playData.status : 'unknown';
    const updatedRun = getRun(token, runId);
    if (updatedRun && Array.isArray(updatedRun.deck)) runDeck = updatedRun.deck;
    sleep(0.2);
  }

  return {
    status: battleStatus,
    type: battleType,
    turns: turnCount,
    deck: runDeck,
  };
}

export default function () {
  log('Login...');
  const loginRes = api(
    'POST',
    '/auth/login',
    null,
    { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
    'login'
  );

  const loginOk = check(loginRes, {
    'login retornou 200': (r) => r.status === 200,
    'token presente': (r) => Boolean(safeJson(r, 'data.token')),
  });

  if (!loginOk) {
    log(`Falha no login: ${loginRes.status}`);
    return;
  }

  const token = loginRes.json('data.token');
  sleep(0.5);

  const victoryStarter = ensureVictoryStarter(token);
  if (!victoryStarter.ok) {
    log('Nao foi possivel preparar a carta starter forte.');
    return;
  }

  abandonActiveRun(token);
  const rankingBefore = getRankingMe(token);

  log('Criando run...');
  const runRes = api('POST', '/runs', token, {}, 'criar run');
  const runCreated = check(runRes, {
    'run criada': (r) => r.status === 201,
  });

  if (!runCreated) {
    log(`Falha ao criar run: ${runRes.status}`);
    return;
  }

  const runData = safeJson(runRes, 'data');
  if (!runData || !runData._id) return;

  let run = runData;
  const runId = runData._id;
  let runStatus = 'active';
  let battleCount = 0;
  let commonCount = 0;
  let bossCount = 0;
  let allRewardsChosen = true;
  let allBattlesWon = true;

  while (runStatus === 'active' && battleCount < 10) {
    battleCount++;
    const battleRes = api('POST', `/runs/${runId}/battles`, token, {}, `criar batalha ${battleCount}`);
    const battleCreated = check(battleRes, {
      'batalha criada': (r) => r.status === 201,
    });

    if (!battleCreated) {
      log(`Erro ao criar batalha ${battleCount}: ${battleRes.status}`);
      break;
    }

    const battleData = safeJson(battleRes, 'data');
    if (!battleData || !battleData._id) break;

    if (battleData.type === 'common') commonCount++;
    if (battleData.type === 'boss') bossCount++;

    const battleResult = playBattle(token, runId, battleData, run.deck);
    allBattlesWon = allBattlesWon && battleResult.status === 'victory';
    log(`Batalha ${battleCount} (${battleResult.type}) terminou: ${battleResult.status}`);

    if (battleResult.status !== 'victory') {
      runStatus = battleResult.status;
      break;
    }

    if (battleData.type === 'common') {
      const rewardChosen = chooseReward(token, runId);
      allRewardsChosen = allRewardsChosen && rewardChosen;
      if (!rewardChosen) break;
    }

    run = getRun(token, runId);
    runStatus = run ? run.status : 'unknown';
    if (runStatus !== 'active') break;
    sleep(0.2);
  }

  const rankingAfter = getRankingMe(token);
  log(`Run ${__ITER + 1} finalizada: ${runStatus}`);

  check({
    runStatus,
    commonCount,
    bossCount,
    battleCount,
    allBattlesWon,
    allRewardsChosen,
    rankingBefore,
    rankingAfter,
  }, {
    'run finalizou como victory': (data) => data.runStatus === 'victory',
    'fluxo teve 5 batalhas comuns': (data) => data.commonCount === 5,
    'fluxo teve 1 boss': (data) => data.bossCount === 1,
    'todas as batalhas foram vencidas': (data) => data.allBattlesWon === true,
    'todas as recompensas comuns foram escolhidas': (data) => data.allRewardsChosen === true,
    'ranking somou uma run': (data) => Number(data.rankingAfter.totalRuns || 0) === Number(data.rankingBefore.totalRuns || 0) + 1,
    'ranking somou uma vitoria': (data) => Number(data.rankingAfter.victories || 0) === Number(data.rankingBefore.victories || 0) + 1,
  });

  sleep(1);

  if (__ITER === TOTAL_ITERATIONS - 1) {
    log('\n========== RANKING FINAL ==========');
    const rankingRes = api('GET', '/ranking?limit=10', token, undefined, 'ranking final');
    const ranking = safeJson(rankingRes, 'data');

    if (ranking && ranking.length > 0) {
      ranking.forEach((entry, i) => {
        log(`#${i+1} ${entry.userName} | Runs: ${entry.totalRuns} | Vitorias: ${entry.victories} | Derrotas: ${entry.defeats} | BestScore: ${entry.bestScore}`);
      });
    }

    if (rankingAfter) {
      log(`\nRESUMO: ${rankingAfter.totalRuns} runs | ${rankingAfter.victories} vitorias | ${rankingAfter.defeats} derrotas | Score: ${rankingAfter.bestScore}`);
    }

    cleanupVictoryStarter(token, victoryStarter.cardId);
  }
}
