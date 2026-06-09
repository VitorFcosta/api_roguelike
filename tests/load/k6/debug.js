import http from 'k6/http';
import { check } from 'k6';

export const options = {
  vus: 1,
  iterations: 3,
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

  console.log(`Status: ${res.status}`);
  console.log(`Body: ${res.body}`);

  check(res, {
    'login 200': (r) => r.status === 200,
  });
}
