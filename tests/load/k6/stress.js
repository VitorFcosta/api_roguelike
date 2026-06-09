import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

export const rateLimited = new Rate('rate_limited');

export const options = {
  stages: [
    { duration: '30s', target: 5 },
    { duration: '30s', target: 10 },
    { duration: '30s', target: 25 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    checks: ['rate>0.95'],
    http_req_duration: ['p(95)<2000'],
  },
};

const BASE_URL = 'http://localhost:3000/v1';
const USER_COUNT = 30;
const PASSWORD = __ENV.LOAD_PASSWORD || 'senha-forte-12345';

function jsonHeaders(token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

function safeJson(res, path) {
  try { return res.json(path); } catch { return null; }
}

function expectedStatuses(...statuses) {
  return { responseCallback: http.expectedStatuses(...statuses) };
}

function request(method, path, token, body, label, statuses = [200, 201, 409, 429]) {
  const params = {
    headers: jsonHeaders(token),
    ...expectedStatuses(...statuses),
  };
  const payload = body === undefined ? null : JSON.stringify(body);
  let res;

  if (method === 'GET') {
    res = http.get(`${BASE_URL}${path}`, params);
  } else if (method === 'POST') {
    res = http.post(`${BASE_URL}${path}`, payload, params);
  } else {
    throw new Error(`Metodo nao suportado: ${method}`);
  }

  rateLimited.add(res.status === 429);
  check(res, {
    [`${label} retornou status esperado`]: (r) => statuses.includes(r.status),
  });

  return res;
}

function listData(res) {
  const data = safeJson(res, 'data');
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.items)) return data.items;
  return [];
}

export function setup() {
  const tokens = [];

  for (let i = 1; i <= USER_COUNT; i++) {
    const user = {
      name: `K6 Stress ${i}`,
      email: `k6-stress-${i}@roguelike.local`,
      password: PASSWORD,
    };

    http.post(
      `${BASE_URL}/auth/register`,
      JSON.stringify(user),
      {
        headers: jsonHeaders(),
        responseCallback: http.expectedStatuses(201, 409),
      }
    );

    const loginRes = http.post(
      `${BASE_URL}/auth/login`,
      JSON.stringify({ email: user.email, password: user.password }),
      {
        headers: jsonHeaders(),
        responseCallback: http.expectedStatuses(200),
      }
    );

    const token = safeJson(loginRes, 'data.token');
    if (token) tokens.push(token);
  }

  if (tokens.length === 0) {
    throw new Error('Nenhum token criado para o stress test.');
  }

  return { tokens };
}

export default function (data) {
  const token = data.tokens[(__VU - 1) % data.tokens.length];

  request('GET', '/cards?page=1&limit=10&sort=name', token, undefined, 'listar cartas');
  request('GET', '/enemies?page=1&limit=10&sort=difficulty', token, undefined, 'listar inimigos');
  request('GET', '/bosses?page=1&limit=10&sort=difficulty', token, undefined, 'listar bosses');
  request('GET', '/ranking?page=1&limit=10&sort=bestScore', token, undefined, 'listar ranking');
  request('GET', '/ranking/me', token, undefined, 'ranking/me');

  if (__ITER % 4 === 0) {
    const runsRes = request(
      'GET',
      '/runs?status=active&page=1&limit=5',
      token,
      undefined,
      'listar runs ativas'
    );

    const activeRun = listData(runsRes).find((run) => run.status === 'active');
    if (activeRun) {
      request('POST', `/runs/${activeRun._id}/abandon`, token, {}, 'abandonar run ativa');
    }

    const createRunRes = request('POST', '/runs', token, {}, 'criar run', [201, 409, 429]);
    const createdRun = safeJson(createRunRes, 'data');
    if (createRunRes.status === 201 && createdRun && createdRun._id) {
      request('POST', `/runs/${createdRun._id}/abandon`, token, {}, 'abandonar run criada');
    }
  }

  sleep(0.2);
}
