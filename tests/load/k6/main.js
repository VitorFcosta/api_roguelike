import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '20s', target: 1 },
    { duration: '40s', target: 2 },
    { duration: '40s', target: 2 },
    { duration: '20s', target: 0 },
  ],
  thresholds: {
    checks: ['rate==1'],
    http_req_duration: ['p(95)<1000'],
    http_req_failed: ['rate<0.05'],
  },
};

const BASE_URL = 'http://localhost:3000/v1';
const RATE_LIMIT_WAIT_SECONDS = 65;

function jsonHeaders(token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

function safeJson(res, path) {
  try { return res.json(path); } catch { return null; }
}

function log(msg) {
  console.log(`[main-vu-${__VU}] ${msg}`);
}

function api(method, path, token, body, label, expectedStatuses) {
  const url = `${BASE_URL}${path}`;
  const params = { headers: jsonHeaders(token) };
  if (expectedStatuses) {
    params.responseCallback = http.expectedStatuses(...expectedStatuses);
  }
  const payload = body === undefined ? null : JSON.stringify(body);
  let res;

  if (method === 'GET') {
    res = http.get(url, params);
  } else if (method === 'POST') {
    res = http.post(url, payload, params);
  } else {
    throw new Error(`Metodo HTTP nao suportado no teste: ${method}`);
  }

  if (res.status === 429) {
    log(`Rate limit em ${label}, aguardando ${RATE_LIMIT_WAIT_SECONDS}s...`);
    sleep(RATE_LIMIT_WAIT_SECONDS);
    if (method === 'GET') return http.get(url, params);
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

function getLoadUser() {
  return {
    name: `K6 Main VU ${__VU}`,
    email: `k6-main-vu-${__VU}@roguelike.local`,
    password: 'senha123',
  };
}

function ensureUser(user) {
  const registerRes = api(
    'POST',
    '/auth/register',
    null,
    {
      name: user.name,
      email: user.email,
      password: user.password,
    },
    'register',
    [201, 409]
  );

  return check(registerRes, {
    'usuario de carga existe ou foi criado': (r) => r.status === 201 || r.status === 409,
  });
}

function login(user) {
  const loginRes = api(
    'POST',
    '/auth/login',
    null,
    {
      email: user.email,
      password: user.password,
    },
    'login'
  );

  const ok = check(loginRes, {
    'login retornou 200': (r) => r.status === 200,
    'token presente': (r) => Boolean(safeJson(r, 'data.token')),
  });

  if (!ok) return null;
  return loginRes.json('data.token');
}

function checkList(label, res) {
  check(res, {
    [`${label} retornou 200`]: (r) => r.status === 200,
    [`${label} retornou lista`]: (r) => Array.isArray(listData(r)),
  });
}

function abandonActiveRuns(token) {
  const runsRes = api('GET', '/runs?status=active&page=1&limit=20', token, undefined, 'listar runs ativas');
  check(runsRes, {
    'listagem de runs ativas retornou 200': (r) => r.status === 200,
  });

  const activeRuns = listData(runsRes).filter((run) => run.status === 'active');
  activeRuns.forEach((run) => {
    const abandonRes = api('POST', `/runs/${run._id}/abandon`, token, {}, 'abandonar run antiga');
    check(abandonRes, {
      'run ativa antiga abandonada': (r) => r.status === 200,
    });
    sleep(0.5);
  });
}

function createAndAbandonRun(token) {
  const createRes = api('POST', '/runs', token, {}, 'criar run');
  const created = check(createRes, {
    'run criada': (r) => r.status === 201,
  });

  if (!created) return;

  const run = safeJson(createRes, 'data');
  check(run, {
    'run criada tem id': (data) => Boolean(data && data._id),
    'run criada esta active': (data) => data && data.status === 'active',
  });

  if (!run || !run._id) return;

  const detailsRes = api('GET', `/runs/${run._id}`, token, undefined, 'detalhar run criada');
  check(detailsRes, {
    'detalhe da run retornou 200': (r) => r.status === 200,
    'detalhe da run esta active': (r) => safeJson(r, 'data.status') === 'active',
  });

  sleep(0.5);

  const abandonRes = api('POST', `/runs/${run._id}/abandon`, token, {}, 'abandonar run criada');
  check(abandonRes, {
    'run criada foi abandonada': (r) => r.status === 200,
    'run terminou abandoned': (r) => safeJson(r, 'data.status') === 'abandoned',
  });
}

export default function () {
  const user = getLoadUser();

  if (!ensureUser(user)) {
    sleep(2);
    return;
  }

  sleep(0.5);

  const token = login(user);
  if (!token) {
    sleep(2);
    return;
  }

  sleep(0.5);

  checkList('cartas paginadas', api('GET', '/cards?page=1&limit=10&sort=name', token, undefined, 'listar cartas'));
  sleep(0.7);

  checkList('inimigos paginados', api('GET', '/enemies?page=1&limit=10&sort=name', token, undefined, 'listar inimigos'));
  sleep(0.7);

  checkList('bosses paginados', api('GET', '/bosses?page=1&limit=10&sort=name', token, undefined, 'listar bosses'));
  sleep(0.7);

  checkList('ranking paginado', api('GET', '/ranking?page=1&limit=10&sort=bestScore', token, undefined, 'listar ranking'));
  sleep(0.7);

  const meRes = api('GET', '/ranking/me', token, undefined, 'ranking/me');
  check(meRes, {
    'ranking/me retornou 200': (r) => r.status === 200,
    'ranking/me tem totalRuns': (r) => safeJson(r, 'data.totalRuns') !== null,
  });

  sleep(0.7);

  abandonActiveRuns(token);
  createAndAbandonRun(token);

  sleep(1);
}
