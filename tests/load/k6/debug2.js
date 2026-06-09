import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 5,
  duration: '15s',
};

const BASE_URL = 'http://localhost:3000/v1';
const ADMIN_EMAIL = __ENV.ADMIN_EMAIL || 'admin@email.com';
const ADMIN_PASSWORD = __ENV.ADMIN_PASSWORD || 'senha-admin-forte-12345';

export default function () {
  const res = http.post(
    `${BASE_URL}/auth/login`,
    JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
    { headers: { 'Content-Type': 'application/json' } }
  );

  if (res.status !== 200) {
    console.log(`FALHA status=${res.status} body=${res.body}`);
  }

  check(res, { 'login 200': (r) => r.status === 200 });
  sleep(1);
}
