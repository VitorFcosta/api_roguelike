import http from 'k6/http';
import { check, sleep } from 'k6';

// ─── CONFIGURAÇÃO DE CARGA ────────────────────────────────────────────────────
export const options = {
  stages: [
    { duration: '30s', target: 2 },
    { duration: '1m',  target: 3 },
    { duration: '1m',  target: 5 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<1000'],
  },
};

const BASE_URL = 'http://localhost:3000/v1';

function jsonHeaders(token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

export default function () {
  // 1. Login
  const loginRes = http.post(
    `${BASE_URL}/auth/login`,
    JSON.stringify({ email: 'admin@email.com', password: 'admin123456' }),
    { headers: jsonHeaders() }
  );

  const loginOk = check(loginRes, {
    'login retornou 200': (r) => r.status === 200,
    'token presente':     (r) => r.json('data.token') !== undefined,
  });

  if (!loginOk) {
    sleep(3);
    return;
  }

  const token = loginRes.json('data.token');
  sleep(1);

  // 2. Listar cartas
  const cardsRes = http.get(`${BASE_URL}/cards`, { headers: jsonHeaders(token) });
  check(cardsRes, { 'listagem de cartas 200': (r) => r.status === 200 });
  sleep(1);

  // 3. Listar inimigos
  const enemiesRes = http.get(`${BASE_URL}/enemies`, { headers: jsonHeaders(token) });
  check(enemiesRes, { 'listagem de inimigos 200': (r) => r.status === 200 });
  sleep(1);

  // 4. Consultar ranking
  const rankingRes = http.get(`${BASE_URL}/ranking`, { headers: jsonHeaders(token) });
  check(rankingRes, { 'ranking retornou 200': (r) => r.status === 200 });
  sleep(1);

  // 5. Iniciar run
  const runRes = http.post(
    `${BASE_URL}/runs`,
    JSON.stringify({}),
    { headers: jsonHeaders(token) }
  );
  check(runRes, { 'run criada ou já ativa': (r) => r.status === 201 || r.status === 409 });
  sleep(2);
}
